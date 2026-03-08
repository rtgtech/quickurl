import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firestore", () => ({
  getLinkByCode: vi.fn(async () => null),
  incrementOwnedLinkClickCount: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth", () => ({
  getAuthenticatedRequestContextWithCookieFallback: vi.fn(async () => null),
}));

import { GET } from "@/app/r/[code]/route";
import { getLinkByCode, incrementOwnedLinkClickCount } from "@/lib/firestore";
import { getAuthenticatedRequestContextWithCookieFallback } from "@/lib/auth";

describe("GET /r/:code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 html for missing code and does not increment", async () => {
    const response = await GET(new Request("http://localhost:3000/r/missing"), {
      params: Promise.resolve({ code: "missing" }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(incrementOwnedLinkClickCount).not.toHaveBeenCalled();
  });

  it("redirects and increments for existing owned public code", async () => {
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

    const response = await GET(new Request("http://localhost:3000/r/g8"), {
      params: Promise.resolve({ code: "g8" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/");
    expect(incrementOwnedLinkClickCount).toHaveBeenCalledWith("g8");
  });

  it("returns branded 401 page for protected link when unauthenticated", async () => {
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
    vi.mocked(getAuthenticatedRequestContextWithCookieFallback).mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost:3000/r/g8"), {
      params: Promise.resolve({ code: "g8" }),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("text/html");
    await expect(response.text()).resolves.toContain("This is a private code, login and try again.");
    expect(incrementOwnedLinkClickCount).not.toHaveBeenCalled();
  });

  it("returns 403 page for protected link when non-owner", async () => {
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
    vi.mocked(getAuthenticatedRequestContextWithCookieFallback).mockResolvedValueOnce({ uid: "u2", email: "x@example.com" });

    const response = await GET(new Request("http://localhost:3000/r/g8"), {
      params: Promise.resolve({ code: "g8" }),
    });

    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(incrementOwnedLinkClickCount).not.toHaveBeenCalled();
  });
});
