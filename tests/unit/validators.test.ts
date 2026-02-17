import { describe, expect, it } from "vitest";
import { validateCustomCode } from "@/lib/validators";

describe("validateCustomCode", () => {
  it("rejects empty code", () => {
    expect(validateCustomCode("   ")).toBe("Custom code cannot be empty");
  });

  it("rejects reserved code", () => {
    expect(validateCustomCode("docs")).toBe("This code is reserved");
  });

  it("rejects invalid characters", () => {
    expect(validateCustomCode("ab-1")).toContain("letters and digits");
  });

  it("accepts valid code", () => {
    expect(validateCustomCode("myCode123")).toBeNull();
  });
});
