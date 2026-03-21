import { describe, expect, test, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

const mockFindMany = mock(() => Promise.resolve([]));
const mockCount = mock(() => Promise.resolve(0));
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
    tradeHistory: {
      findMany: mockFindMany,
      count: mockCount,
    },
  },
  safeQuery: mockSafeQuery,
}));

// Mock next/cache for 'use cache' support
mock.module("next/cache", () => ({
  cacheLife: mock(() => {}),
  cacheTag: mock(() => {}),
}));

describe("GET /api/trades", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockCount.mockReset();
    mockFindMany.mockReturnValue(Promise.resolve([]));
    mockCount.mockReturnValue(Promise.resolve(0));
  });

  test("returns paginated empty result", async () => {
    const { GET } = await import("../../../app/api/trades/route");
    const req = new NextRequest("http://localhost/api/trades");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.trades).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
  });

  test("returns trades from db", async () => {
    const fakeTrade = {
      id: "uuid-1",
      symbol: "AAPL",
      outcomePnl: 150,
      orderType: "buy",
      status: "filled",
      closedAt: new Date("2024-01-15"),
      openedAt: new Date("2024-01-05"),
      rationale: "Strong buy signal",
      deletedAt: null,
    };
    mockFindMany.mockReturnValue(Promise.resolve([fakeTrade]));
    mockCount.mockReturnValue(Promise.resolve(1));

    const { GET } = await import("../../../app/api/trades/route");
    const req = new NextRequest("http://localhost/api/trades");
    const res = await GET(req);
    const body = await res.json();

    expect(body.total).toBe(1);
    expect(body.trades).toHaveLength(1);
    expect(body.trades[0].symbol).toBe("AAPL");
  });

  test("parses page query param", async () => {
    const { GET } = await import("../../../app/api/trades/route");
    const req = new NextRequest("http://localhost/api/trades?page=3");
    const res = await GET(req);
    const body = await res.json();
    expect(body.page).toBe(3);
  });

  test("defaults page to 1 for invalid input", async () => {
    const { GET } = await import("../../../app/api/trades/route");
    const req = new NextRequest("http://localhost/api/trades?page=abc");
    const res = await GET(req);
    const body = await res.json();
    expect(body.page).toBe(1);
  });
});
