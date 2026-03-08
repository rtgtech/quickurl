import { beforeEach, describe, expect, it, vi } from "vitest";

const txGet = vi.fn();
const txSet = vi.fn();
const docRef = { id: "g8" };

const dbMock = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => docRef),
  })),
  runTransaction: vi.fn(async (callback: (tx: { get: typeof txGet; set: typeof txSet }) => Promise<void>) =>
    callback({
      get: txGet,
      set: txSet,
    }),
  ),
};

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: vi.fn(() => dbMock),
}));

import { incrementOwnedLinkClickCount, normalizeClickCount } from "@/lib/firestore";

describe("firestore click analytics helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults missing clickCount to 0", () => {
    expect(normalizeClickCount(undefined)).toBe(0);
    expect(normalizeClickCount(null)).toBe(0);
    expect(normalizeClickCount(4)).toBe(4);
  });

  it("increments only when ownerUid exists", async () => {
    txGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerUid: null,
        isDeleted: false,
      }),
    });

    await incrementOwnedLinkClickCount("g8");
    expect(txSet).not.toHaveBeenCalled();

    txGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerUid: "u1",
        isDeleted: false,
      }),
    });

    await incrementOwnedLinkClickCount("g8");
    expect(txSet).toHaveBeenCalledTimes(1);
  });
});
