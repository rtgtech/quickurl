import { describe, expect, it } from "vitest";
import { base62Encode } from "@/lib/code";

describe("base62Encode", () => {
  it("encodes zero", () => {
    expect(base62Encode(0)).toBe("0");
  });

  it("encodes positive integers", () => {
    expect(base62Encode(61)).toBe("Z");
    expect(base62Encode(62)).toBe("10");
    expect(base62Encode(1000)).toBe("g8");
  });

  it("throws on negative values", () => {
    expect(() => base62Encode(-1)).toThrow();
  });
});
