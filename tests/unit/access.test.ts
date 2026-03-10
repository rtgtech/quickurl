import { describe, expect, it } from "vitest";
import { canAccessLink } from "@/lib/access";

describe("canAccessLink", () => {
  it("allows public link for anonymous", () => {
    expect(
      canAccessLink({ accessMode: "public", ownerUid: null, allowedUserUids: [] }, null),
    ).toBe("allowed");
  });

  it("requires auth for protected link", () => {
    expect(
      canAccessLink({ accessMode: "auth_required", ownerUid: "u1", allowedUserUids: ["u1"] }, null),
    ).toBe("unauthenticated");
  });

  it("allows protected link for owner even if owner is not in allowlist", () => {
    expect(
      canAccessLink(
        { accessMode: "auth_required", ownerUid: "u1", allowedUserUids: ["u2"] },
        { uid: "u1", email: "x@example.com" },
      ),
    ).toBe("allowed");
  });

  it("allows protected link for allowlisted non-owner", () => {
    expect(
      canAccessLink(
        { accessMode: "auth_required", ownerUid: "u1", allowedUserUids: ["u2"] },
        { uid: "u2", email: "x@example.com" },
      ),
    ).toBe("allowed");
  });

  it("forbids protected link for non-owner not on allowlist", () => {
    expect(
      canAccessLink(
        { accessMode: "auth_required", ownerUid: "u1", allowedUserUids: ["u3"] },
        { uid: "u2", email: "x@example.com" },
      ),
    ).toBe("forbidden");
  });
});
