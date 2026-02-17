import { NextResponse } from "next/server";
import { getLinkByCode } from "@/lib/firestore";
import { normalizeUrl, validateTargetUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS: HeadersInit = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCodeNotFoundHtml(code: string): string {
  const safeCode = escapeHtml(code);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Not Found - QuickURL</title>
    <link rel="stylesheet" href="/legacy.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div class="page">
      <header class="hero">
        <div>
          <p class="kicker">QuickURL</p>
          <h1>We could not find that short code.</h1>
          <p class="subhead">Double-check the code or create a new short link.</p>
        </div>
        <div class="orb" aria-hidden="true"></div>
      </header>
      <main class="not-found">
        <section class="card">
          <h2>Code not found</h2>
          <p class="muted">The code <span class="code-pill">${safeCode}</span> does not exist in the database.</p>
          <div class="not-found-actions">
            <a class="primary button-link" href="/">Create a short link</a>
          </div>
        </section>
      </main>
    </div>
  </body>
</html>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const link = await getLinkByCode(code);
  if (!link) {
    return new Response(renderCodeNotFoundHtml(code), {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...NO_STORE_HEADERS,
      },
    });
  }

  const target = normalizeUrl(link.url);
  const targetError = validateTargetUrl(target);
  if (targetError) {
    return Response.json(
      { error: "Invalid URL for this short code" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const response = NextResponse.redirect(target, 307);
  for (const [header, value] of Object.entries(NO_STORE_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
}
