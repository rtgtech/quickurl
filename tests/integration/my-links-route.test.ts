import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedRequestContext: vi.fn(async () => null),
}));

vi.mock("@/lib/firestore", () => ({
  listLinksByOwner: vi.fn(async () => []),
}));

import { GET } from "@/app/api/my-links/route";
import { getAuthenticatedRequestContext } from "@/lib/auth";

describe("GET /api/my-links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth", async () => {
    const request = new Request("http://localhost:3000/api/my-links");
    const response = await GET(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication required" });
  });

  it("returns links when authenticated", async () => {
    vi.mocked(getAuthenticatedRequestContext).mockResolvedValueOnce({ uid: "u1", email: "x@example.com" });

    const request = new Request("http://localhost:3000/api/my-links", {
      headers: { Authorization: "Bearer token" },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ links: [] });
  });
});
