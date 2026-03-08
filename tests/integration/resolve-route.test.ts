import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firestore", () => ({
  getLinkByCode: vi.fn(async () => null),
  incrementOwnedLinkClickCount: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth", () => ({
  getAuthenticatedRequestContext: vi.fn(async () => null),
}));

import { GET } from "@/app/resolve/[code]/route";
import { getLinkByCode, incrementOwnedLinkClickCount } from "@/lib/firestore";
import { getAuthenticatedRequestContext } from "@/lib/auth";

describe("GET /resolve/:code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for missing code", async () => {
    const request = new Request("http://localhost:3000/resolve/missing");
    const response = await GET(request, { params: Promise.resolve({ code: "missing" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Short code not found" });
    expect(incrementOwnedLinkClickCount).not.toHaveBeenCalled();
  });

  it("returns URL and increments for public existing code", async () => {
    vi.mocked(getLinkByCode).mockResolvedValueOnce({
      shortCode: "g8",
      url: "https://example.com",
      ownerUid: "u1",
      accessMode: "public",
      allowedUserUids: [],
      allowedEmails: [],
      isCustom: false,
      isDeleted: false,
      clickCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const request = new Request("http://localhost:3000/resolve/g8");
    const response = await GET(request, { params: Promise.resolve({ code: "g8" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://example.com" });
    expect(incrementOwnedLinkClickCount).toHaveBeenCalledWith("g8");
  });

  it("does not increment for unowned public link", async () => {
    vi.mocked(getLinkByCode).mockResolvedValueOnce({
      shortCode: "g8",
      url: "https://example.com",
      ownerUid: null,
      accessMode: "public",
      allowedUserUids: [],
      allowedEmails: [],
      isCustom: false,
      isDeleted: false,
      clickCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const request = new Request("http://localhost:3000/resolve/g8");
    const response = await GET(request, { params: Promise.resolve({ code: "g8" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://example.com" });
    expect(incrementOwnedLinkClickCount).not.toHaveBeenCalled();
  });

  it("returns 401 for protected link when unauthenticated", async () => {
    vi.mocked(getLinkByCode).mockResolvedValueOnce({
      shortCode: "g8",
      url: "https://example.com",
      ownerUid: "u1",
      accessMode: "auth_required",
      allowedUserUids: ["u1"],
      allowedEmails: ["owner@example.com"],
      isCustom: false,
      isDeleted: false,
      clickCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(getAuthenticatedRequestContext).mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/resolve/g8");
    const response = await GET(request, { params: Promise.resolve({ code: "g8" }) });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication required" });
    expect(incrementOwnedLinkClickCount).not.toHaveBeenCalled();
  });

  it("returns 403 for protected link when non-owner", async () => {
    vi.mocked(getLinkByCode).mockResolvedValueOnce({
      shortCode: "g8",
      url: "https://example.com",
      ownerUid: "u1",
      accessMode: "auth_required",
      allowedUserUids: ["u1"],
      allowedEmails: ["owner@example.com"],
      isCustom: false,
      isDeleted: false,
      clickCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(getAuthenticatedRequestContext).mockResolvedValueOnce({ uid: "u2", email: "x@example.com" });

    const request = new Request("http://localhost:3000/resolve/g8");
    const response = await GET(request, { params: Promise.resolve({ code: "g8" }) });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(incrementOwnedLinkClickCount).not.toHaveBeenCalled();
  });
});
