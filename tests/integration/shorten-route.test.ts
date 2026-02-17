import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedRequestContext: vi.fn(async () => null),
}));

vi.mock("@/lib/firestore", () => ({
  createShortLink: vi.fn(async () => ({ code: "g8", reusedExistingCode: false })),
}));

import { POST } from "@/app/shorten/route";
import { createShortLink } from "@/lib/firestore";

describe("POST /shorten", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing url", async () => {
    const request = new Request("http://localhost:3000/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing 'url' in JSON body" });
  });

  it("returns shortened payload", async () => {
    const request = new Request("http://localhost:3000/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "example.com" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      short_code: "g8",
      short_url: "http://localhost:3000/g8",
    });

    expect(createShortLink).toHaveBeenCalledWith({
      url: "https://example.com",
      ownerUid: null,
      customCode: null,
    });
  });

  it("returns 409 on custom code conflict", async () => {
    vi.mocked(createShortLink).mockRejectedValueOnce(new Error("CUSTOM_CODE_TAKEN"));

    const request = new Request("http://localhost:3000/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com", custom_code: "myCode123" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Custom code is already taken" });
  });
});
