import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { base62Encode } from "@/lib/code";
import {
  COUNTER_DOC_PATH,
  LINKS_COLLECTION,
  SHORTENER_COUNTER_START,
  UNAUTHENTICATED_LINK_TTL_MS,
} from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import type { LinkDocument, RawLinkDocument } from "@/lib/types";

interface CreateLinkInput {
  url: string;
  ownerUid: string | null;
  customCode?: string | null;
}

interface CreateLinkResult {
  code: string;
  reusedExistingCode: boolean;
}

function isAlreadyExistsError(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return code === 6 || code === "6" || code === "already-exists";
}

function mapLinkDocument(shortCode: string, data: RawLinkDocument): LinkDocument {
  return {
    shortCode,
    url: data.url,
    ownerUid: data.ownerUid,
    isCustom: Boolean(data.isCustom),
    isDeleted: Boolean(data.isDeleted),
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
      isCustom: true,
      isDeleted: false,
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
        if (!isSoftDeleted(existingData) && (existingData.url ?? "") === input.url) {
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
        isCustom: false,
        isDeleted: false,
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

export async function updateOwnedLink(input: {
  code: string;
  ownerUid: string;
  url: string;
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

  await ref.update({
    url: input.url,
    updatedAt: Timestamp.now(),
  });

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
