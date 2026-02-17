import { getAuthenticatedRequestContext } from "@/lib/auth";
import { createShortLink } from "@/lib/firestore";
import { jsonResponse, buildCorsHeaders } from "@/lib/http";
import { normalizeUrl, validateTargetUrl } from "@/lib/url";
import { validateCustomCode } from "@/lib/validators";

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

  const authContext = await getAuthenticatedRequestContext(request);

  try {
    const result = await createShortLink({
      url: normalizedUrl,
      ownerUid: authContext?.uid ?? null,
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
