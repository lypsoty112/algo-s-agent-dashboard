import { describe, expect, test, mock } from "bun:test";
import { NextRequest } from "next/server";

const mockGetHistoricalBars = mock((symbol: string) => {
  const bars =
    symbol === "SPY"
      ? [
          { t: "2024-01-01T00:00:00Z", o: 460, h: 465, l: 458, c: 460, v: 1000 },
          { t: "2024-01-02T00:00:00Z", o: 460, h: 480, l: 459, c: 480, v: 1200 },
          { t: "2024-01-03T00:00:00Z", o: 480, h: 495, l: 479, c: 490, v: 1100 },
        ]
      : [
          { t: "2024-01-01T00:00:00Z", o: 380, h: 385, l: 378, c: 380, v: 900 },
          { t: "2024-01-02T00:00:00Z", o: 380, h: 400, l: 379, c: 400, v: 950 },
          { t: "2024-01-03T00:00:00Z", o: 400, h: 410, l: 399, c: 408, v: 880 },
        ];
  return Promise.resolve(bars);
});

mock.module("@/lib/alpaca", () => ({
  getHistoricalBars: mockGetHistoricalBars,
}));

mock.module("next/cache", () => ({
  cacheLife: mock(() => {}),
  cacheTag: mock(() => {}),
}));

describe("GET /api/benchmark", () => {
  test("returns 400 when start param is missing", async () => {
    const { GET } = await import("../../../app/api/benchmark/route");
    const req = new NextRequest("http://localhost/api/benchmark");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("start");
  });

  test("returns spy and qqq data", async () => {
    const { GET } = await import("../../../app/api/benchmark/route");
    const req = new NextRequest("http://localhost/api/benchmark?start=2024-01-01");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.spy).toBeDefined();
    expect(body.qqq).toBeDefined();
    expect(Array.isArray(body.spy.timestamps)).toBe(true);
    expect(Array.isArray(body.spy.values)).toBe(true);
    expect(Array.isArray(body.qqq.values)).toBe(true);
  });

  test("normalizes SPY to 100 at t=0", async () => {
    const { GET } = await import("../../../app/api/benchmark/route");
    const req = new NextRequest("http://localhost/api/benchmark?start=2024-01-01");
    const res = await GET(req);
    const body = await res.json();

    expect(body.spy.values[0]).toBe(100);
    expect(body.qqq.values[0]).toBe(100);
  });

  test("normalizes subsequent values relative to base", async () => {
    const { GET } = await import("../../../app/api/benchmark/route");
    const req = new NextRequest("http://localhost/api/benchmark?start=2024-01-01");
    const res = await GET(req);
    const body = await res.json();

    // SPY: base=460, day2=480 → 480/460*100 ≈ 104.35
    expect(body.spy.values[1]).toBeCloseTo((480 / 460) * 100, 2);
    // QQQ: base=380, day2=400 → 400/380*100 ≈ 105.26
    expect(body.qqq.values[1]).toBeCloseTo((400 / 380) * 100, 2);
  });

  test("returns 502 when Alpaca throws", async () => {
    mockGetHistoricalBars.mockImplementationOnce(() => Promise.reject(new Error("Alpaca error")));

    const { GET } = await import("../../../app/api/benchmark/route");
    const req = new NextRequest("http://localhost/api/benchmark?start=2024-01-01");
    const res = await GET(req);
    expect(res.status).toBe(502);
  });
});
