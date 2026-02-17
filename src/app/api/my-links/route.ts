import { getAuthenticatedRequestContext } from "@/lib/auth";
import { listLinksByOwner } from "@/lib/firestore";
import { jsonResponse, buildCorsHeaders } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedRequestContext(request);
  if (!auth) {
    return jsonResponse(request, { error: "Authentication required" }, { status: 401 });
  }

  const links = await listLinksByOwner(auth.uid);
  return jsonResponse(request, { links });
}
