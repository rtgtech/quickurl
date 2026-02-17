import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const RESERVED_SEGMENTS = new Set([
  "",
  "docs",
  "dashboard",
  "shorten",
  "resolve",
  "api",
  "_next",
  "favicon.ico",
  "r",
]);

export function middleware(request: NextRequest) {
  if (!["GET", "HEAD"].includes(request.method)) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  if (pathname === "/") {
    return NextResponse.next();
  }

  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  if (!trimmed || trimmed.includes("/")) {
    return NextResponse.next();
  }

  if (trimmed.includes(".")) {
    return NextResponse.next();
  }

  if (RESERVED_SEGMENTS.has(trimmed.toLowerCase())) {
    return NextResponse.next();
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/r/${trimmed}`;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/:path*"],
};
