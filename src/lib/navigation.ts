export function sanitizeNextPath(rawNext: string | null): string | null {
  if (!rawNext) {
    return null;
  }

  const next = rawNext.trim();
  if (!next.startsWith("/")) {
    return null;
  }

  // Disallow protocol-relative or absolute URL-like paths.
  if (next.startsWith("//") || next.includes("://")) {
    return null;
  }

  return next;
}
