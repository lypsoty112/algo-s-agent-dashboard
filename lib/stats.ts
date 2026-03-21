// Server-side only. No DB/API access.

const RISK_FREE_DAILY = 0.045 / 252;

export function computeReturns(equities: number[]): number[] {
  console.log("[stats] computeReturns — input length:", equities.length);
  if (equities.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < equities.length; i++) {
    returns.push((equities[i] - equities[i - 1]) / equities[i - 1]);
  }
  return returns;
}

export function annualizedReturn(returns: number[]): number {
  console.log("[stats] annualizedReturn — input length:", returns.length);
  if (returns.length === 0) return 0;
  const totalReturn = returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
  const years = returns.length / 252;
  return Math.pow(1 + totalReturn, 1 / years) - 1;
}

export function sharpeRatio(
  returns: number[],
  riskFreeRate = RISK_FREE_DAILY
): number | null {
  console.log("[stats] sharpeRatio — input length:", returns.length, returns.length < 10 ? "(too few, returning null)" : "");
  if (returns.length < 10) return null;
  const excess = returns.map((r) => r - riskFreeRate);
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length;
  const variance = excess.reduce((a, b) => a + (b - mean) ** 2, 0) / excess.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return null;
  return (mean / stdDev) * Math.sqrt(252);
}

export function sortinoRatio(
  returns: number[],
  riskFreeRate = RISK_FREE_DAILY
): number | null {
  console.log("[stats] sortinoRatio — input length:", returns.length, returns.length < 10 ? "(too few, returning null)" : "");
  if (returns.length < 10) return null;
  const excess = returns.map((r) => r - riskFreeRate);
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length;
  const downside = excess.filter((r) => r < 0);
  if (downside.length === 0) return null;
  // Downside deviation uses the full N in the denominator (semi-deviation)
  const downsideVariance =
    downside.reduce((a, b) => a + b ** 2, 0) / excess.length;
  const downsideStdDev = Math.sqrt(downsideVariance);
  if (downsideStdDev === 0) return null;
  return (mean / downsideStdDev) * Math.sqrt(252);
}

export function maxDrawdown(equities: number[]): {
  maxDrawdownPct: number;
  peakIndex: number;
  troughIndex: number;
} {
  console.log("[stats] maxDrawdown — input length:", equities.length);
  if (equities.length === 0) {
    return { maxDrawdownPct: 0, peakIndex: 0, troughIndex: 0 };
  }

  let maxDD = 0;
  let peakIdx = 0;
  let troughIdx = 0;
  let peak = equities[0];
  let currentPeakIdx = 0;

  for (let i = 0; i < equities.length; i++) {
    if (equities[i] > peak) {
      peak = equities[i];
      currentPeakIdx = i;
    }
    const dd = peak > 0 ? (peak - equities[i]) / peak : 0;
    if (dd > maxDD) {
      maxDD = dd;
      peakIdx = currentPeakIdx;
      troughIdx = i;
    }
  }

  return { maxDrawdownPct: maxDD, peakIndex: peakIdx, troughIndex: troughIdx };
}

export function monthlyReturns(
  timestamps: number[],
  equities: number[]
): { month: string; returnPct: number }[] {
  if (timestamps.length !== equities.length || timestamps.length === 0) return [];

  // Group by YYYY-MM, tracking first and last equity value per month
  const monthMap = new Map<string, { first: number; last: number }>();

  for (let i = 0; i < timestamps.length; i++) {
    const date = new Date(timestamps[i] * 1000); // unix seconds → ms
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const existing = monthMap.get(month);
    if (!existing) {
      monthMap.set(month, { first: equities[i], last: equities[i] });
    } else {
      existing.last = equities[i];
    }
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { first, last }]) => ({
      month,
      returnPct: first !== 0 ? ((last - first) / first) * 100 : 0,
    }));
}

export interface TradeStatistics {
  totalTrades: number;
  winRate: number;
  avgWinner: number;
  avgLoser: number;
  profitFactor: number;
  avgHoldingPeriodDays: number;
  largestWin: number;
  largestLoss: number;
}

export function tradeStats(
  trades: { pnl: number; pnl_pct: number; holding_period_days: number }[]
): TradeStatistics {
  console.log("[stats] tradeStats — trade count:", trades.length);
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      avgWinner: 0,
      avgLoser: 0,
      profitFactor: 0,
      avgHoldingPeriodDays: 0,
      largestWin: 0,
      largestLoss: 0,
    };
  }

  const winners = trades.filter((t) => t.pnl > 0);
  const losers = trades.filter((t) => t.pnl <= 0);

  const totalGains = winners.reduce((a, t) => a + t.pnl, 0);
  const totalLosses = Math.abs(losers.reduce((a, t) => a + t.pnl, 0));

  return {
    totalTrades: trades.length,
    winRate: winners.length / trades.length,
    avgWinner: winners.length > 0 ? totalGains / winners.length : 0,
    avgLoser: losers.length > 0 ? totalLosses / losers.length : 0,
    profitFactor:
      totalLosses > 0 ? totalGains / totalLosses : winners.length > 0 ? Infinity : 0,
    avgHoldingPeriodDays:
      trades.reduce((a, t) => a + (t.holding_period_days ?? 0), 0) / trades.length,
    largestWin: winners.length > 0 ? Math.max(...winners.map((t) => t.pnl)) : 0,
    largestLoss:
      losers.length > 0 ? Math.max(...losers.map((t) => Math.abs(t.pnl))) : 0,
  };
}
