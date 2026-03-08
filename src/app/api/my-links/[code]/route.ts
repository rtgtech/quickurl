import { getAuthenticatedRequestContext } from "@/lib/auth";
import { deleteOwnedLink, updateOwnedLink } from "@/lib/firestore";
import { getAdminAuth } from "@/lib/firebase/admin";
import { jsonResponse, buildCorsHeaders } from "@/lib/http";
import { normalizeUrl, validateTargetUrl } from "@/lib/url";
import { validateAccessMode } from "@/lib/validators";
import type { AccessMode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const auth = await getAuthenticatedRequestContext(request, { checkRevoked: true });
  if (!auth) {
    return jsonResponse(request, { error: "Authentication required" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    url?: unknown;
    access_mode?: unknown;
    allowed_emails?: unknown;
  };
  const hasUrl = payload.url !== undefined && payload.url !== null;
  const hasAccessMode = payload.access_mode !== undefined && payload.access_mode !== null;
  const hasAllowedEmails = payload.allowed_emails !== undefined;
  if (!hasUrl && !hasAccessMode && !hasAllowedEmails) {
    return jsonResponse(
      request,
      { error: "Provide 'url', 'access_mode', and/or 'allowed_emails' in JSON body" },
      { status: 400 },
    );
  }

  let normalizedUrl: string | undefined;
  if (hasUrl) {
    normalizedUrl = normalizeUrl(String(payload.url));
    const urlError = validateTargetUrl(normalizedUrl);
    if (urlError) {
      return jsonResponse(request, { error: urlError }, { status: 400 });
    }
  }

  let accessMode: AccessMode | undefined;
  if (hasAccessMode) {
    const parsedAccessMode = validateAccessMode(String(payload.access_mode));
    if (!parsedAccessMode) {
      return jsonResponse(request, { error: "Invalid 'access_mode'. Use 'public' or 'auth_required'" }, { status: 400 });
    }
    accessMode = parsedAccessMode;
  }

  let allowedEmails: string[] | undefined;
  let allowedUserUids: string[] | undefined;
  if (hasAllowedEmails) {
    if (!Array.isArray(payload.allowed_emails)) {
      return jsonResponse(request, { error: "'allowed_emails' must be an array of emails" }, { status: 400 });
    }

    const normalizedEmails = payload.allowed_emails
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean);
    const uniqueEmails = [...new Set(normalizedEmails)];

    // Resolve immediately as requested; reject unknown emails.
    const resolvedUids: string[] = [];
    for (const email of uniqueEmails) {
      try {
        const userRecord = await getAdminAuth().getUserByEmail(email);
        resolvedUids.push(userRecord.uid);
      } catch {
        return jsonResponse(request, { error: `No Firebase user found for email: ${email}` }, { status: 400 });
      }
    }

    allowedEmails = uniqueEmails;
    allowedUserUids = [...new Set(resolvedUids)];
  }

  const { code } = await params;
  const outcome = await updateOwnedLink({
    code,
    ownerUid: auth.uid,
    url: normalizedUrl,
    accessMode,
    allowedEmails,
    allowedUserUids,
  });

  if (outcome === "not_found") {
    return jsonResponse(request, { error: "Short code not found" }, { status: 404 });
  }

  if (outcome === "forbidden") {
    return jsonResponse(request, { error: "Forbidden" }, { status: 403 });
  }

  return jsonResponse(request, { ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const auth = await getAuthenticatedRequestContext(request, { checkRevoked: true });
  if (!auth) {
    return jsonResponse(request, { error: "Authentication required" }, { status: 401 });
  }

  const { code } = await params;
  const outcome = await deleteOwnedLink({
    code,
    ownerUid: auth.uid,
  });

  if (outcome === "not_found") {
    return jsonResponse(request, { error: "Short code not found" }, { status: 404 });
  }

  if (outcome === "forbidden") {
    return jsonResponse(request, { error: "Forbidden" }, { status: 403 });
  }

  return jsonResponse(request, { ok: true });
}
