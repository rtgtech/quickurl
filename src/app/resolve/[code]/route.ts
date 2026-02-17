import { getLinkByCode } from "@/lib/firestore";
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const link = await getLinkByCode(code);
  if (!link) {
    return jsonResponse(request, { error: "Short code not found" }, { status: 404 });
  }

  const target = normalizeUrl(link.url);
  const targetError = validateTargetUrl(target);
  if (targetError) {
    return jsonResponse(request, { error: "Invalid URL for this short code" }, { status: 400 });
  }

  return jsonResponse(request, { url: target });
}
