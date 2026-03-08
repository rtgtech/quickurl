import { describe, expect, it } from "vitest";
import { canAccessLink } from "@/lib/access";

describe("canAccessLink", () => {
  it("allows public link for anonymous", () => {
    expect(canAccessLink({ accessMode: "public", allowedUserUids: [] }, null)).toBe("allowed");
  });

  it("requires auth for protected link", () => {
    expect(canAccessLink({ accessMode: "auth_required", allowedUserUids: ["u1"] }, null)).toBe("unauthenticated");
  });

  it("allows protected link for owner", () => {
    expect(
      canAccessLink({ accessMode: "auth_required", allowedUserUids: ["u1"] }, { uid: "u1", email: "x@example.com" }),
    ).toBe("allowed");
  });

  it("forbids protected link for non-owner", () => {
    expect(
      canAccessLink({ accessMode: "auth_required", allowedUserUids: ["u1"] }, { uid: "u2", email: "x@example.com" }),
    ).toBe("forbidden");
  });
});
