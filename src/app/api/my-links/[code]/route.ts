import { getAuthenticatedRequestContext } from "@/lib/auth";
import { deleteOwnedLink, updateOwnedLink } from "@/lib/firestore";
import { jsonResponse, buildCorsHeaders } from "@/lib/http";
import { normalizeUrl, validateTargetUrl } from "@/lib/url";

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
  const auth = await getAuthenticatedRequestContext(request);
  if (!auth) {
    return jsonResponse(request, { error: "Authentication required" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as { url?: unknown };
  if (payload.url === undefined || payload.url === null) {
    return jsonResponse(request, { error: "Missing 'url' in JSON body" }, { status: 400 });
  }

  const normalizedUrl = normalizeUrl(String(payload.url));
  const urlError = validateTargetUrl(normalizedUrl);
  if (urlError) {
    return jsonResponse(request, { error: urlError }, { status: 400 });
  }

  const { code } = await params;
  const outcome = await updateOwnedLink({
    code,
    ownerUid: auth.uid,
    url: normalizedUrl,
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
  const auth = await getAuthenticatedRequestContext(request);
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
