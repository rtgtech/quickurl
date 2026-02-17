import { CORS_ALLOWED_ORIGINS } from "@/lib/constants";

export function buildCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const allowOrigin =
    CORS_ALLOWED_ORIGINS.length === 0
      ? "*"
      : origin && CORS_ALLOWED_ORIGINS.includes(origin)
        ? origin
        : CORS_ALLOWED_ORIGINS[0]!;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    Vary: "Origin",
  };
}

export function jsonResponse(
  request: Request,
  body: unknown,
  init?: Omit<ResponseInit, "headers"> & { headers?: HeadersInit },
): Response {
  return Response.json(body, {
    ...init,
    headers: {
      ...buildCorsHeaders(request),
      ...(init?.headers ?? {}),
    },
  });
}
