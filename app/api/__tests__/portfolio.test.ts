import { describe, expect, test, mock } from "bun:test";

const mockGetAccount = mock(() =>
  Promise.resolve({
    equity: "100000.00",
    buying_power: "50000.00",
    cash: "25000.00",
    portfolio_value: "100000.00",
    last_equity: "99000.00",
  })
);

const mockGetPortfolioHistory = mock(() =>
  Promise.resolve({
    timestamp: [1700000000, 1700086400],
    equity: [95000, 100000],
    profit_loss: [-5000, 0],
    profit_loss_pct: [-0.05, 0],
    base_value: 100000,
  })
);

mock.module("@/lib/alpaca", () => ({
  getAccount: mockGetAccount,
  getPortfolioHistory: mockGetPortfolioHistory,
}));

mock.module("next/cache", () => ({
  cacheLife: mock(() => {}),
  cacheTag: mock(() => {}),
}));

describe("GET /api/portfolio", () => {
  test("returns correct response shape", async () => {
    const { GET } = await import("../../../app/api/portfolio/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(typeof body.equity).toBe("number");
    expect(typeof body.buyingPower).toBe("number");
    expect(Array.isArray(body.timestamps)).toBe(true);
    expect(Array.isArray(body.equities)).toBe(true);
    expect(Array.isArray(body.profitLoss)).toBe(true);
  });

  test("parses equity from string to number", async () => {
    const { GET } = await import("../../../app/api/portfolio/route");
    const res = await GET();
    const body = await res.json();
    expect(body.equity).toBe(100000);
    expect(body.buyingPower).toBe(50000);
  });

  test("returns 502 when Alpaca throws", async () => {
    mockGetAccount.mockImplementationOnce(() => Promise.reject(new Error("Alpaca down")));

    const { GET } = await import("../../../app/api/portfolio/route");
    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
