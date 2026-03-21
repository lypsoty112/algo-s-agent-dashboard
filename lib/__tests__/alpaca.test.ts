import { describe, expect, test, beforeEach, afterEach, spyOn } from "bun:test";

// We test the fetch wrapper by spying on global fetch
describe("alpaca client", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.APCA_API_KEY_ID = "test-key-id";
    process.env.APCA_API_SECRET_KEY = "test-secret-key";
  });

  afterEach(() => {
    process.env.APCA_API_KEY_ID = originalEnv.APCA_API_KEY_ID;
    process.env.APCA_API_SECRET_KEY = originalEnv.APCA_API_SECRET_KEY;
  });

  test("getAccount constructs correct URL and sends auth headers", async () => {
    const mockAccount = {
      equity: "100000",
      buying_power: "50000",
      cash: "25000",
      portfolio_value: "100000",
      last_equity: "99000",
    };

    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockAccount), { status: 200 })
    );

    const { getAccount } = await import("../alpaca");
    const account = await getAccount();

    expect(account).toEqual(mockAccount);

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://paper-api.alpaca.markets/v2/account");
    expect((opts.headers as Record<string, string>)["APCA-API-KEY-ID"]).toBe("test-key-id");
    expect((opts.headers as Record<string, string>)["APCA-API-SECRET-KEY"]).toBe(
      "test-secret-key"
    );

    fetchSpy.mockRestore();
  });

  test("getPositions calls correct trading endpoint", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    );

    const { getPositions } = await import("../alpaca");
    await getPositions();

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://paper-api.alpaca.markets/v2/positions");

    fetchSpy.mockRestore();
  });

  test("getPortfolioHistory passes query params", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ timestamp: [], equity: [], profit_loss: [], base_value: 0 }),
        { status: 200 }
      )
    );

    const { getPortfolioHistory } = await import("../alpaca");
    await getPortfolioHistory({ period: "1A", timeframe: "1D" });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain("period=1A");
    expect(url).toContain("timeframe=1D");

    fetchSpy.mockRestore();
  });

  test("getHistoricalBars uses data API base URL", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ bars: [] }), { status: 200 })
    );

    const { getHistoricalBars } = await import("../alpaca");
    await getHistoricalBars("SPY", { start: "2024-01-01", timeframe: "1Day" });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain("https://data.alpaca.markets");
    expect(url).toContain("/v2/stocks/SPY/bars");

    fetchSpy.mockRestore();
  });

  test("throws on non-OK responses", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Forbidden", { status: 403 })
    );

    const { getAccount } = await import("../alpaca");
    await expect(getAccount()).rejects.toThrow("403");

    fetchSpy.mockRestore();
  });

  test("throws clear error when env vars are missing", async () => {
    delete process.env.APCA_API_KEY_ID;
    delete process.env.APCA_API_SECRET_KEY;

    const { getAccount } = await import("../alpaca");
    await expect(getAccount()).rejects.toThrow("Missing Alpaca API credentials");
  });
});
