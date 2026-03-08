import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firestore", () => ({
  getLinkByCode: vi.fn(async () => null),
  incrementOwnedLinkClickCount: vi.fn(async () => undefined),
}));

import { GET } from "@/app/resolve/[code]/route";
import { getLinkByCode, incrementOwnedLinkClickCount } from "@/lib/firestore";

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

  it("returns URL for existing code", async () => {
    vi.mocked(getLinkByCode).mockResolvedValueOnce({
      shortCode: "g8",
      url: "https://example.com",
      ownerUid: "u1",
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

  it("does not increment for unowned link", async () => {
    vi.mocked(getLinkByCode).mockResolvedValueOnce({
      shortCode: "g8",
      url: "https://example.com",
      ownerUid: null,
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

  it("does not increment when URL validation fails", async () => {
    vi.mocked(getLinkByCode).mockResolvedValueOnce({
      shortCode: "g8",
      url: "https://exa mple.com",
      ownerUid: "u1",
      isCustom: false,
      isDeleted: false,
      clickCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const request = new Request("http://localhost:3000/resolve/g8");
    const response = await GET(request, { params: Promise.resolve({ code: "g8" }) });

    expect(response.status).toBe(400);
    expect(incrementOwnedLinkClickCount).not.toHaveBeenCalled();
  });
});
