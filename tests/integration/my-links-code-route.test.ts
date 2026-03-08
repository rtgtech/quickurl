import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedRequestContext: vi.fn(async () => null),
}));

vi.mock("@/lib/firestore", () => ({
  updateOwnedLink: vi.fn(async () => "updated"),
  deleteOwnedLink: vi.fn(async () => "deleted"),
}));

import { PATCH } from "@/app/api/my-links/[code]/route";
import { getAuthenticatedRequestContext } from "@/lib/auth";
import { updateOwnedLink } from "@/lib/firestore";

describe("PATCH /api/my-links/:code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const request = new Request("http://localhost:3000/api/my-links/g8", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_mode: "public" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ code: "g8" }) });
    expect(response.status).toBe(401);
  });

  it("updates access mode for owner", async () => {
    vi.mocked(getAuthenticatedRequestContext).mockResolvedValueOnce({ uid: "u1", email: "x@example.com" });

    const request = new Request("http://localhost:3000/api/my-links/g8", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_mode: "auth_required" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ code: "g8" }) });
    expect(response.status).toBe(200);
    expect(updateOwnedLink).toHaveBeenCalledWith({
      code: "g8",
      ownerUid: "u1",
      url: undefined,
      accessMode: "auth_required",
      allowedUserUids: undefined,
      allowedEmails: undefined,
    });
  });

  it("returns 400 for invalid access_mode", async () => {
    vi.mocked(getAuthenticatedRequestContext).mockResolvedValueOnce({ uid: "u1", email: "x@example.com" });

    const request = new Request("http://localhost:3000/api/my-links/g8", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_mode: "private" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ code: "g8" }) });
    expect(response.status).toBe(400);
  });
});
