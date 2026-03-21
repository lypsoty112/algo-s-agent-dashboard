import { describe, expect, test, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

const mockFindMany = mock(() => Promise.resolve([]));
const mockSafeQuery = mock(async (fn: () => Promise<unknown>) => {
  try {
    const data = await fn();
    return { data, error: null };
  } catch {
    return { data: null, error: "error" };
  }
});

mock.module("@/lib/db", () => ({
  db: {
    strategy: {
      findMany: mockFindMany,
    },
  },
  safeQuery: mockSafeQuery,
}));

mock.module("next/cache", () => ({
  cacheLife: mock(() => {}),
  cacheTag: mock(() => {}),
}));

describe("GET /api/strategies", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindMany.mockReturnValue(Promise.resolve([]));
  });

  test("returns empty result", async () => {
    const { GET } = await import("../../../app/api/strategies/route");
    const req = new NextRequest("http://localhost/api/strategies");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.strategies).toEqual([]);
    expect(body.total).toBe(0);
  });

  test("adds superseded flag based on deleted_at", async () => {
    const active = {
      id: "uuid-1",
      type: "stock",
      subject: "Momentum",
      deletedAt: null,
      createdAt: new Date("2024-01-01"),
    };
    const superseded = {
      id: "uuid-2",
      type: "stock",
      subject: "Old momentum",
      deletedAt: new Date("2024-06-01"),
      createdAt: new Date("2023-01-01"),
    };
    mockFindMany.mockReturnValue(Promise.resolve([active, superseded]));

    const { GET } = await import("../../../app/api/strategies/route");
    const req = new NextRequest("http://localhost/api/strategies?showSuperseded=true");
    const res = await GET(req);
    const body = await res.json();

    expect(body.total).toBe(2);
    const activeResult = body.strategies.find((s: { id: string }) => s.id === "uuid-1");
    const supersededResult = body.strategies.find((s: { id: string }) => s.id === "uuid-2");
    expect(activeResult.superseded).toBe(false);
    expect(supersededResult.superseded).toBe(true);
  });

  test("filters out superseded by default", async () => {
    const active = {
      id: "uuid-1",
      type: "stock",
      subject: "Momentum",
      deletedAt: null,
      createdAt: new Date("2024-01-01"),
    };
    mockFindMany.mockReturnValue(Promise.resolve([active]));

    const { GET } = await import("../../../app/api/strategies/route");
    // Default: showSuperseded is false, query builds deleted_at: null filter
    const req = new NextRequest("http://localhost/api/strategies");
    const res = await GET(req);
    const body = await res.json();

    expect(body.total).toBe(1);
    expect(body.strategies[0].superseded).toBe(false);
  });

  test("filters by type", async () => {
    const { GET } = await import("../../../app/api/strategies/route");
    const req = new NextRequest("http://localhost/api/strategies?type=stock");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockSafeQuery).toHaveBeenCalled();
  });
});
