import { describe, expect, test, mock, beforeEach } from "bun:test";

const mockGetPositions = mock(() => Promise.resolve([]));
const mockGetAccount = mock(() =>
  Promise.resolve({
    equity: "100000",
    buying_power: "50000",
    cash: "25000",
    portfolio_value: "100000",
    last_equity: "99000",
  })
);

const mockFindMany = mock(() => Promise.resolve([]));
const mockSafeQuery = mock(async (fn: () => Promise<unknown>) => {
  try {
    const data = await fn();
    return { data, error: null };
  } catch {
    return { data: null, error: "error" };
  }
});

mock.module("@/lib/alpaca", () => ({
  getPositions: mockGetPositions,
  getAccount: mockGetAccount,
}));

mock.module("@/lib/db", () => ({
  db: {
    tradeHistory: {
      findMany: mockFindMany,
    },
  },
  safeQuery: mockSafeQuery,
}));

mock.module("next/cache", () => ({
  cacheLife: mock(() => {}),
  cacheTag: mock(() => {}),
}));

describe("GET /api/positions", () => {
  beforeEach(() => {
    mockGetPositions.mockReset();
    mockGetPositions.mockReturnValue(Promise.resolve([]));
    mockFindMany.mockReset();
    mockFindMany.mockReturnValue(Promise.resolve([]));
  });

  test("returns empty positions and buying power", async () => {
    const { GET } = await import("../../../app/api/positions/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.positions).toEqual([]);
    expect(body.buyingPower).toBe(50000);
  });

  test("merges Alpaca position with thesis from trade_history", async () => {
    mockGetPositions.mockReturnValue(
      Promise.resolve([
        {
          symbol: "AAPL",
          qty: "10",
          side: "long",
          avg_entry_price: "150.00",
          current_price: "175.00",
          market_value: "1750.00",
          unrealized_pl: "250.00",
          unrealized_plpc: "0.1667",
          change_today: "0.01",
          asset_id: "abc",
          lastday_price: "173.00",
        },
      ])
    );

    mockFindMany.mockReturnValue(
      Promise.resolve([
        {
          id: "uuid-42",
          symbol: "AAPL",
          rationale: "Strong iPhone supercycle ahead",
          orderType: "buy",
          deletedAt: null,
          createdAt: new Date("2024-01-10"),
        },
        {
          id: "uuid-40",
          symbol: "AAPL",
          rationale: "Old rationale",
          orderType: "buy",
          deletedAt: null,
          createdAt: new Date("2024-01-01"),
        },
      ])
    );

    const { GET } = await import("../../../app/api/positions/route");
    const res = await GET();
    const body = await res.json();

    expect(body.positions).toHaveLength(1);
    const pos = body.positions[0];
    expect(pos.symbol).toBe("AAPL");
    // Most recent buy row comes first (id=uuid-42 ordered by createdAt desc)
    expect(pos.rationale).toBe("Strong iPhone supercycle ahead");
    expect(pos.trade_id).toBe("uuid-42");
    expect(pos.current_price).toBe(175);
    expect(pos.unrealized_pl).toBe(250);
  });

  test("sets thesis to null when no matching trade_history row", async () => {
    mockGetPositions.mockReturnValue(
      Promise.resolve([
        {
          symbol: "TSLA",
          qty: "5",
          side: "long",
          avg_entry_price: "200.00",
          current_price: "210.00",
          market_value: "1050.00",
          unrealized_pl: "50.00",
          unrealized_plpc: "0.05",
          change_today: "0.02",
          asset_id: "xyz",
          lastday_price: "205.00",
        },
      ])
    );
    mockFindMany.mockReturnValue(Promise.resolve([]));

    const { GET } = await import("../../../app/api/positions/route");
    const res = await GET();
    const body = await res.json();

    expect(body.positions[0].rationale).toBeNull();
    expect(body.positions[0].trade_id).toBeNull();
  });

  test("returns 502 when Alpaca throws", async () => {
    mockGetPositions.mockImplementationOnce(() => Promise.reject(new Error("Alpaca error")));

    const { GET } = await import("../../../app/api/positions/route");
    const res = await GET();
    expect(res.status).toBe(502);
  });
});
