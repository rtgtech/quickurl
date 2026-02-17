import { describe, expect, it } from "vitest";
import { normalizeUrl, validateTargetUrl } from "@/lib/url";

describe("URL helpers", () => {
  it("normalizes missing scheme to https", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
  });

  it("normalizes localhost without scheme to http", () => {
    expect(normalizeUrl("localhost:3000/app")).toBe("http://localhost:3000/app");
  });

  it("rejects whitespace", () => {
    expect(validateTargetUrl("https://exa mple.com")).toBe("URL must not contain whitespace");
  });

  it("rejects non-localhost http", () => {
    expect(validateTargetUrl("http://example.com")).toBe("Only https:// URLs are allowed");
  });

  it("accepts https and localhost http", () => {
    expect(validateTargetUrl("https://example.com")).toBeNull();
    expect(validateTargetUrl("http://localhost:5000")).toBeNull();
  });
});
