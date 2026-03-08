import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/lib/navigation";

describe("sanitizeNextPath", () => {
  it("accepts local absolute paths", () => {
    expect(sanitizeNextPath("/g8")).toBe("/g8");
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard");
  });

  it("rejects empty and non-local values", () => {
    expect(sanitizeNextPath(null)).toBeNull();
    expect(sanitizeNextPath("")).toBeNull();
    expect(sanitizeNextPath("https://evil.example")).toBeNull();
    expect(sanitizeNextPath("//evil.example")).toBeNull();
    expect(sanitizeNextPath("g8")).toBeNull();
  });
});
