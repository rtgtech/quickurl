export const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const BASE = ALPHABET.length;

export const COUNTER_DOC_PATH = "meta/counter";
export const LINKS_COLLECTION = "links";

export const SHORTENER_COUNTER_START = Number.parseInt(
  process.env.SHORTENER_COUNTER_START ?? "1000",
  10,
);

export const CUSTOM_CODE_PATTERN = /^[0-9A-Za-z]{2,64}$/;

export const RESERVED_CODES = new Set<string>([
  "docs",
  "shorten",
  "resolve",
  "static",
  "favicon.ico",
  "dashboard",
  "api",
]);

export const LOCAL_HOSTNAMES = new Set<string>(["localhost", "127.0.0.1", "::1"]);

export const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const UNAUTHENTICATED_LINK_TTL_MS = 6 * 60 * 60 * 1000;
