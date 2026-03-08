import { getAuthenticatedRequestContext } from "@/lib/auth";
import { createShortLink } from "@/lib/firestore";
import { jsonResponse, buildCorsHeaders } from "@/lib/http";
import { normalizeUrl, validateTargetUrl } from "@/lib/url";
import { validateAccessMode, validateCustomCode } from "@/lib/validators";
import type { AccessMode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    url?: unknown;
    custom_code?: unknown;
    code?: unknown;
    access_mode?: unknown;
  };

  const rawUrl = payload.url;
  if (rawUrl === undefined || rawUrl === null || `${rawUrl}`.trim() === "") {
    return jsonResponse(request, { error: "Missing 'url' in JSON body" }, { status: 400 });
  }

  const normalizedUrl = normalizeUrl(String(rawUrl));
  if (!normalizedUrl) {
    return jsonResponse(request, { error: "Missing 'url' in JSON body" }, { status: 400 });
  }

  const urlError = validateTargetUrl(normalizedUrl);
  if (urlError) {
    return jsonResponse(request, { error: urlError }, { status: 400 });
  }

  let customCode: string | null = null;
  const rawCustomCode = payload.custom_code ?? payload.code;
  if (rawCustomCode !== undefined && rawCustomCode !== null) {
    const trimmed = String(rawCustomCode).trim();
    if (trimmed) {
      const customCodeError = validateCustomCode(trimmed);
      if (customCodeError) {
        return jsonResponse(request, { error: customCodeError }, { status: 400 });
      }
      customCode = trimmed;
    }
  }

  const authContext = await getAuthenticatedRequestContext(request, { checkRevoked: true });
  let accessMode: AccessMode = "public";
  if (payload.access_mode !== undefined && payload.access_mode !== null) {
    const parsedAccessMode = validateAccessMode(String(payload.access_mode));
    if (!parsedAccessMode) {
      return jsonResponse(request, { error: "Invalid 'access_mode'. Use 'public' or 'auth_required'" }, { status: 400 });
    }

    if (parsedAccessMode === "auth_required" && !authContext) {
      return jsonResponse(
        request,
        { error: "Authentication is required to set access_mode='auth_required'" },
        { status: 400 },
      );
    }

    accessMode = parsedAccessMode;
  }

  try {
    const allowedUserUids =
      accessMode === "auth_required" && authContext?.uid ? [authContext.uid] : [];
    const allowedEmails =
      accessMode === "auth_required" && authContext?.email ? [authContext.email] : [];

    const result = await createShortLink({
      url: normalizedUrl,
      ownerUid: authContext?.uid ?? null,
      accessMode,
      allowedUserUids,
      allowedEmails,
      customCode,
    });

    const shortCode = result.code;
    const origin = new URL(request.url).origin;

    return jsonResponse(request, {
      short_code: shortCode,
      short_url: `${origin}/${shortCode}`,
    });
  } catch (error) {
    if ((error as Error).message === "CUSTOM_CODE_TAKEN") {
      return jsonResponse(request, { error: "Custom code is already taken" }, { status: 409 });
    }

    return jsonResponse(request, { error: "Failed to shorten URL" }, { status: 500 });
  }
}
