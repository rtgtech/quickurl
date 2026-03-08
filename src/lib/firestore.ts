import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { base62Encode } from "@/lib/code";
import {
  COUNTER_DOC_PATH,
  LINKS_COLLECTION,
  SHORTENER_COUNTER_START,
  UNAUTHENTICATED_LINK_TTL_MS,
} from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import type { AccessMode, LinkDocument, RawLinkDocument } from "@/lib/types";

interface CreateLinkInput {
  url: string;
  ownerUid: string | null;
  accessMode: AccessMode;
  allowedUserUids: string[];
  allowedEmails: string[];
  customCode?: string | null;
}

interface CreateLinkResult {
  code: string;
  reusedExistingCode: boolean;
}

export function normalizeClickCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  return 0;
}

function isAlreadyExistsError(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return code === 6 || code === "6" || code === "already-exists";
}

function mapLinkDocument(shortCode: string, data: RawLinkDocument): LinkDocument {
  const allowedUserUids = Array.isArray(data.allowedUserUids)
    ? data.allowedUserUids.filter((value): value is string => typeof value === "string")
    : [];
  const allowedEmails = Array.isArray(data.allowedEmails)
    ? data.allowedEmails.filter((value): value is string => typeof value === "string")
    : [];

  return {
    shortCode,
    url: data.url,
    ownerUid: data.ownerUid,
    accessMode: data.accessMode ?? "public",
    allowedUserUids,
    allowedEmails,
    isCustom: Boolean(data.isCustom),
    isDeleted: Boolean(data.isDeleted),
    clickCount: normalizeClickCount(data.clickCount),
    createdAt: data.createdAt.toDate().toISOString(),
    updatedAt: data.updatedAt.toDate().toISOString(),
  };
}

function isSoftDeleted(data: RawLinkDocument): boolean {
  return Boolean(data.isDeleted);
}

function isExpiredAnonymousLink(data: RawLinkDocument, nowMs = Date.now()): boolean {
  if (data.ownerUid) {
    return false;
  }

  const createdAtMs = data.createdAt.toDate().getTime();
  return nowMs - createdAtMs > UNAUTHENTICATED_LINK_TTL_MS;
}

function canReclaimCustomCode(data: RawLinkDocument, nowMs = Date.now()): boolean {
  const hasAuthenticatedOwner = Boolean(data.ownerUid);
  const softDeleted = isSoftDeleted(data);

  // Rule 2.1: authenticated-owned code can be reassigned only when soft-deleted.
  if (hasAuthenticatedOwner) {
    return softDeleted;
  }

  // Rule 2.2: unauthenticated code can be reassigned when expired.
  return isExpiredAnonymousLink(data, nowMs);
}

async function allocateNextGeneratedCode(): Promise<string> {
  const db = getAdminDb();
  const counterRef = db.doc(COUNTER_DOC_PATH);

  const code = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(counterRef);
    const nextValue = snapshot.exists
      ? Number(snapshot.get("nextValue"))
      : SHORTENER_COUNTER_START;

    tx.set(
      counterRef,
      {
        nextValue: nextValue + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return base62Encode(nextValue);
  });

  return code;
}

export async function createShortLink(input: CreateLinkInput): Promise<CreateLinkResult> {
  const db = getAdminDb();

  if (input.customCode) {
    const customRef = db.collection(LINKS_COLLECTION).doc(input.customCode);
    const createPayload = {
      url: input.url,
      ownerUid: input.ownerUid,
      accessMode: input.accessMode,
      allowedUserUids: input.allowedUserUids,
      allowedEmails: input.allowedEmails,
      isCustom: true,
      isDeleted: false,
      clickCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    try {
      await customRef.create(createPayload);
      return {
        code: input.customCode,
        reusedExistingCode: false,
      };
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }

      const existing = await customRef.get();
      if (existing.exists) {
        const existingData = existing.data() as RawLinkDocument;

        if (canReclaimCustomCode(existingData)) {
          await customRef.set({
            url: input.url,
            ownerUid: null,
            accessMode: "public",
            allowedUserUids: [],
            allowedEmails: [],
            isCustom: true,
            isDeleted: false,
            clickCount: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });

          return {
            code: input.customCode,
            reusedExistingCode: true,
          };
        }
      }

      throw new Error("CUSTOM_CODE_TAKEN");
    }
  }

  let lastError: unknown;
  for (let i = 0; i < 8; i += 1) {
    const generatedCode = await allocateNextGeneratedCode();
    const docRef = db.collection(LINKS_COLLECTION).doc(generatedCode);

    try {
      await docRef.create({
        url: input.url,
        ownerUid: input.ownerUid,
        accessMode: input.accessMode,
        allowedUserUids: input.allowedUserUids,
        allowedEmails: input.allowedEmails,
        isCustom: false,
        isDeleted: false,
        clickCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return {
        code: generatedCode,
        reusedExistingCode: false,
      };
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }
      lastError = error;
      continue;
    }
  }

  throw new Error(`FAILED_TO_ALLOCATE_UNIQUE_CODE: ${String(lastError)}`);
}

export async function getLinkByCode(code: string): Promise<LinkDocument | null> {
  const db = getAdminDb();
  const snap = await db.collection(LINKS_COLLECTION).doc(code).get();
  if (!snap.exists) {
    return null;
  }

  const data = snap.data() as RawLinkDocument;
  if (isSoftDeleted(data) || isExpiredAnonymousLink(data)) {
    return null;
  }

  return mapLinkDocument(code, data);
}

export async function listLinksByOwner(ownerUid: string): Promise<LinkDocument[]> {
  const db = getAdminDb();
  const querySnap = await db
    .collection(LINKS_COLLECTION)
    .where("ownerUid", "==", ownerUid)
    .orderBy("createdAt", "desc")
    .get();

  return querySnap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as RawLinkDocument }))
    .filter((doc) => !isSoftDeleted(doc.data))
    .map((doc) => mapLinkDocument(doc.id, doc.data));
}

export async function incrementOwnedLinkClickCount(code: string): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(LINKS_COLLECTION).doc(code);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return;
    }

    const data = snap.data() as RawLinkDocument;
    if (!data.ownerUid || isSoftDeleted(data)) {
      return;
    }

    tx.set(
      ref,
      {
        clickCount: FieldValue.increment(1),
      },
      { merge: true },
    );
  });
}

export async function updateOwnedLink(input: {
  code: string;
  ownerUid: string;
  url?: string;
  accessMode?: AccessMode;
  allowedUserUids?: string[];
  allowedEmails?: string[];
}): Promise<"updated" | "not_found" | "forbidden"> {
  const db = getAdminDb();
  const ref = db.collection(LINKS_COLLECTION).doc(input.code);
  const snap = await ref.get();
  if (!snap.exists) {
    return "not_found";
  }

  const data = snap.data() as RawLinkDocument;
  if ((data.ownerUid ?? null) !== input.ownerUid) {
    return "forbidden";
  }
  if (isSoftDeleted(data)) {
    return "not_found";
  }

  const updates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (input.url !== undefined) {
    updates.url = input.url;
  }

  if (input.accessMode !== undefined) {
    updates.accessMode = input.accessMode;
  }

  if (input.allowedUserUids !== undefined) {
    updates.allowedUserUids = input.allowedUserUids;
  }

  if (input.allowedEmails !== undefined) {
    updates.allowedEmails = input.allowedEmails;
  }

  // Preserve existing allowlist when toggling modes; only auto-seed owner when
  // switching to auth_required and the stored allowlist is currently empty.
  if (
    input.accessMode === "auth_required" &&
    input.allowedUserUids === undefined &&
    input.allowedEmails === undefined
  ) {
    const existingAllowedUserUids = Array.isArray(data.allowedUserUids)
      ? data.allowedUserUids.filter((value): value is string => typeof value === "string")
      : [];
    const existingAllowedEmails = Array.isArray(data.allowedEmails)
      ? data.allowedEmails.filter((value): value is string => typeof value === "string")
      : [];

    if (existingAllowedUserUids.length === 0 && existingAllowedEmails.length === 0) {
      updates.allowedUserUids = [input.ownerUid];
    }
  }

  await ref.update(updates);

  return "updated";
}

export async function deleteOwnedLink(input: {
  code: string;
  ownerUid: string;
}): Promise<"deleted" | "not_found" | "forbidden"> {
  const db = getAdminDb();
  const ref = db.collection(LINKS_COLLECTION).doc(input.code);
  const snap = await ref.get();
  if (!snap.exists) {
    return "not_found";
  }

  const data = snap.data() as RawLinkDocument;
  if ((data.ownerUid ?? null) !== input.ownerUid) {
    return "forbidden";
  }
  if (isSoftDeleted(data)) {
    return "not_found";
  }

  await ref.update({
    isDeleted: true,
    updatedAt: Timestamp.now(),
  });
  return "deleted";
}
