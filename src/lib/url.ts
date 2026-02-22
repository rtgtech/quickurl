import { urlSchema } from "@/lib/validators";
import { LOCAL_HOSTNAMES } from "@/lib/constants";

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }

  // Only treat inputs with explicit web schemes as already normalized.
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsedNetloc = new URL(`http://${trimmed}`);
    const host = parsedNetloc.hostname || "";
    if (host.includes("localhost") || host.includes("127.0.0.1") || host === "::1") {
      return `http://${trimmed}`;
    }
  } catch {
    // Fall through to default https normalization.
  }

  return `https://${trimmed}`;
}

export function validateTargetUrl(url: string): string | null {
  if (!url) {
    return "Missing 'url' in JSON body";
  }

  if ([...url].some((ch) => /\s/.test(ch))) {
    return "URL must not contain whitespace";
  }

  const parsed = urlSchema.safeParse(url);
  if (!parsed.success) {
    return "URL must start with http:// or https://";
  }

  const parsedUrl = new URL(url);
  const scheme = parsedUrl.protocol.replace(":", "").toLowerCase();
  const hostname = parsedUrl.hostname;

  if (!hostname) {
    return "URL must include a hostname";
  }

  if (scheme === "http" && !LOCAL_HOSTNAMES.has(hostname.toLowerCase())) {
    return "Only https:// URLs are allowed";
  }

  return null;
}
