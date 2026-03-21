import { describe, expect, test } from "bun:test";
import {
  computeReturns,
  annualizedReturn,
  sharpeRatio,
  sortinoRatio,
  maxDrawdown,
  monthlyReturns,
  tradeStats,
} from "../stats";

describe("computeReturns", () => {
  test("returns empty array for < 2 data points", () => {
    expect(computeReturns([])).toEqual([]);
    expect(computeReturns([100])).toEqual([]);
  });

  test("computes daily returns correctly", () => {
    const returns = computeReturns([100, 110, 99]);
    expect(returns[0]).toBeCloseTo(0.1, 10);
    expect(returns[1]).toBeCloseTo(-0.1, 10);
  });

  test("flat equity series produces zero returns", () => {
    const returns = computeReturns([100, 100, 100]);
    expect(returns).toEqual([0, 0]);
  });
});

describe("annualizedReturn", () => {
  test("returns 0 for empty array", () => {
    expect(annualizedReturn([])).toBe(0);
  });

  test("annualizes 252 daily returns of 0.1% each", () => {
    const dailyReturn = 0.001;
    const returns = Array(252).fill(dailyReturn);
    const annualized = annualizedReturn(returns);
    // (1.001)^252 - 1 ≈ 28.5%
    expect(annualized).toBeGreaterThan(0.25);
    expect(annualized).toBeLessThan(0.32);
  });
});

describe("sharpeRatio", () => {
  test("returns null for < 10 data points", () => {
    expect(sharpeRatio([])).toBeNull();
    expect(sharpeRatio([0.01, 0.02, 0.01])).toBeNull();
    expect(sharpeRatio(Array(9).fill(0.001))).toBeNull();
  });

  test("returns a number for >= 10 data points", () => {
    const returns = Array(50).fill(0.002);
    const result = sharpeRatio(returns);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("number");
  });

  test("returns null when std dev is zero (all returns identical excess)", () => {
    // All returns equal to risk-free rate → zero excess → zero std dev
    const dailyRF = 0.045 / 252;
    const result = sharpeRatio(Array(20).fill(dailyRF));
    expect(result).toBeNull();
  });

  test("positive returns produce positive Sharpe", () => {
    const returns = Array(50).fill(0.005);
    const result = sharpeRatio(returns);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });
});

describe("sortinoRatio", () => {
  test("returns null for < 10 data points", () => {
    expect(sortinoRatio(Array(5).fill(0.01))).toBeNull();
  });

  test("returns null when there are no downside returns", () => {
    const returns = Array(20).fill(0.01);
    expect(sortinoRatio(returns)).toBeNull();
  });

  test("only counts downside deviation", () => {
    // Mix of ups and downs
    const returns = Array(25)
      .fill(null)
      .map((_, i) => (i % 2 === 0 ? 0.01 : -0.005));
    const sortino = sortinoRatio(returns);
    const sharpe = sharpeRatio(returns);
    expect(sortino).not.toBeNull();
    expect(sharpe).not.toBeNull();
    // Sortino is typically higher than Sharpe for asymmetric return series
    expect(sortino!).toBeGreaterThan(sharpe!);
  });
});

describe("maxDrawdown", () => {
  test("returns 0 for empty array", () => {
    expect(maxDrawdown([])).toEqual({ maxDrawdownPct: 0, peakIndex: 0, troughIndex: 0 });
  });

  test("returns 0% for flat or always-rising equity", () => {
    expect(maxDrawdown([100, 100, 100]).maxDrawdownPct).toBe(0);
    expect(maxDrawdown([100, 110, 120]).maxDrawdownPct).toBe(0);
  });

  test("detects peak-to-trough correctly", () => {
    const equities = [100, 120, 90, 110];
    const result = maxDrawdown(equities);
    // Peak at index 1 (120), trough at index 2 (90) = 25% drawdown
    expect(result.maxDrawdownPct).toBeCloseTo(0.25, 5);
    expect(result.peakIndex).toBe(1);
    expect(result.troughIndex).toBe(2);
  });

  test("handles single element", () => {
    expect(maxDrawdown([100])).toEqual({ maxDrawdownPct: 0, peakIndex: 0, troughIndex: 0 });
  });
});

describe("monthlyReturns", () => {
  test("returns empty for empty input", () => {
    expect(monthlyReturns([], [])).toEqual([]);
  });

  test("returns empty when arrays are different lengths", () => {
    expect(monthlyReturns([1], [])).toEqual([]);
  });

  test("groups daily equities by month", () => {
    // Jan 2024: starts at 100, ends at 110
    const jan1 = Math.floor(new Date("2024-01-01T00:00:00Z").getTime() / 1000);
    const jan31 = Math.floor(new Date("2024-01-31T00:00:00Z").getTime() / 1000);
    const feb1 = Math.floor(new Date("2024-02-01T00:00:00Z").getTime() / 1000);
    const feb28 = Math.floor(new Date("2024-02-28T00:00:00Z").getTime() / 1000);

    const ts = [jan1, jan31, feb1, feb28];
    const eq = [100, 110, 110, 121];
    const result = monthlyReturns(ts, eq);

    expect(result).toHaveLength(2);
    expect(result[0].month).toBe("2024-01");
    expect(result[0].returnPct).toBeCloseTo(10, 5); // +10%
    expect(result[1].month).toBe("2024-02");
    expect(result[1].returnPct).toBeCloseTo(10, 5); // +10%
  });
});

describe("tradeStats", () => {
  test("returns zeroed stats for empty array", () => {
    const result = tradeStats([]);
    expect(result.totalTrades).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.profitFactor).toBe(0);
  });

  test("calculates win rate correctly", () => {
    const trades = [
      { pnl: 100, pnl_pct: 0.1, holding_period_days: 5 },
      { pnl: 50, pnl_pct: 0.05, holding_period_days: 3 },
      { pnl: -30, pnl_pct: -0.03, holding_period_days: 2 },
    ];
    const result = tradeStats(trades);
    expect(result.totalTrades).toBe(3);
    expect(result.winRate).toBeCloseTo(2 / 3, 5);
    expect(result.avgWinner).toBeCloseTo(75, 5);
    expect(result.avgLoser).toBeCloseTo(30, 5);
    expect(result.profitFactor).toBeCloseTo(150 / 30, 5);
  });

  test("profit factor is Infinity when all trades are winners", () => {
    const trades = [
      { pnl: 100, pnl_pct: 0.1, holding_period_days: 5 },
      { pnl: 50, pnl_pct: 0.05, holding_period_days: 3 },
    ];
    const result = tradeStats(trades);
    expect(result.winRate).toBe(1);
    expect(result.profitFactor).toBe(Infinity);
    expect(result.largestLoss).toBe(0);
  });

  test("handles all-losers correctly", () => {
    const trades = [
      { pnl: -100, pnl_pct: -0.1, holding_period_days: 5 },
      { pnl: -50, pnl_pct: -0.05, holding_period_days: 3 },
    ];
    const result = tradeStats(trades);
    expect(result.winRate).toBe(0);
    expect(result.profitFactor).toBe(0);
    expect(result.largestWin).toBe(0);
    expect(result.largestLoss).toBe(100);
  });

  test("calculates largest win and loss", () => {
    const trades = [
      { pnl: 500, pnl_pct: 0.5, holding_period_days: 10 },
      { pnl: 100, pnl_pct: 0.1, holding_period_days: 5 },
      { pnl: -200, pnl_pct: -0.2, holding_period_days: 3 },
      { pnl: -50, pnl_pct: -0.05, holding_period_days: 2 },
    ];
    const result = tradeStats(trades);
    expect(result.largestWin).toBe(500);
    expect(result.largestLoss).toBe(200);
  });

  test("calculates average holding period", () => {
    const trades = [
      { pnl: 100, pnl_pct: 0.1, holding_period_days: 10 },
      { pnl: -50, pnl_pct: -0.05, holding_period_days: 20 },
    ];
    const result = tradeStats(trades);
    expect(result.avgHoldingPeriodDays).toBe(15);
  });
});
