// Server-side only. No DB/API access.

// ---------------------------------------------------------------------------
// Win rate from raw Alpaca orders (FIFO lot matching)
// ---------------------------------------------------------------------------
//
// Handles:
//   • Long trades  (buy → sell)
//   • Short trades (sell → buy)
//   • Scaling in/out (multiple orders on the same side before closing)
//   • Mixed direction (sell excess beyond a long → opens short in one pass)
//
// A "trade" is one complete round trip: position opens, then fully returns to flat.
// Partial closes accumulate P&L; the trade is only recorded when the position
// reaches exactly zero shares.
//
// Limitation: orders opened *before* the 200-order window may look like naked
// openers for the opposite direction.  Acceptable for a 200-order look-back.

export interface WinRateResult {
  wins: number;
  losses: number;
  totalTrades: number;
  winRate: number | null; // null when no completed trades found
}

export function computeWinRateFromOrders(
  rawOrders: {
    symbol: string;
    side: string;
    status: string;
    filled_qty: string;
    filled_avg_price: string | null;
    filled_at: string | null;
  }[],
): WinRateResult {
  // Only fully-filled orders, sorted oldest → newest
  const orders = rawOrders
    .filter(
      (o) =>
        o.status === "filled" &&
        o.filled_at !== null &&
        parseFloat(o.filled_qty || "0") > 0,
    )
    .sort(
      (a, b) =>
        new Date(a.filled_at!).getTime() - new Date(b.filled_at!).getTime(),
    );

  // Group by symbol
  const bySymbol = new Map<string, typeof orders>();
  for (const o of orders) {
    if (!bySymbol.has(o.symbol)) bySymbol.set(o.symbol, []);
    bySymbol.get(o.symbol)!.push(o);
  }

  interface Lot {
    qty: number;
    price: number;
  }
  interface CompletedTrade {
    realizedPnl: number;
    totalInvested: number; // total capital committed to the opening leg
  }

  const completed: CompletedTrade[] = [];

  for (const symOrders of bySymbol.values()) {
    let longLots: Lot[] = []; // open long lots (FIFO)
    let shortLots: Lot[] = []; // open short lots (FIFO)
    let currentPnl = 0;
    let totalInvested = 0;

    const recordTrade = () => {
      completed.push({ realizedPnl: currentPnl, totalInvested });
      currentPnl = 0;
      totalInvested = 0;
    };

    // Drain qty from a lot queue, accumulating P&L. Returns leftover qty.
    const drainLots = (
      lots: Lot[],
      qty: number,
      closePrice: number,
      isLong: boolean, // true = closing long (buy low, sell high)
    ): number => {
      let remaining = qty;
      while (remaining > 1e-8 && lots.length > 0) {
        const lot = lots[0];
        const fill = Math.min(remaining, lot.qty);
        currentPnl += isLong
          ? (closePrice - lot.price) * fill // long profit = sell - buy
          : (lot.price - closePrice) * fill; // short profit = open sell - close buy
        remaining -= fill;
        lot.qty -= fill;
        if (lot.qty < 1e-8) lots.shift();
      }
      return remaining;
    };

    for (const order of symOrders) {
      const qty = parseFloat(order.filled_qty);
      const price = parseFloat(order.filled_avg_price ?? "0");
      if (qty <= 0 || price <= 0) continue;

      if (order.side === "buy") {
        if (shortLots.length > 0) {
          // Closing (part of) a short position
          const leftover = drainLots(shortLots, qty, price, false);
          if (shortLots.length === 0) {
            recordTrade(); // short fully closed
            if (leftover > 1e-8) {
              // Excess flips into a new long
              longLots.push({ qty: leftover, price });
              totalInvested = leftover * price;
            }
          }
        } else {
          // Opening or adding to long
          longLots.push({ qty, price });
          totalInvested += qty * price;
        }
      } else {
        // sell
        if (longLots.length > 0) {
          // Closing (part of) a long position
          const leftover = drainLots(longLots, qty, price, true);
          if (longLots.length === 0) {
            recordTrade(); // long fully closed
            if (leftover > 1e-8) {
              // Excess flips into a new short
              shortLots.push({ qty: leftover, price });
              totalInvested = leftover * price;
            }
          }
        } else {
          // Opening or adding to short
          shortLots.push({ qty, price });
          totalInvested += qty * price;
        }
      }
    }
  }

  const wins = completed.filter((t) => t.realizedPnl > 0).length;
  const losses = completed.filter((t) => t.realizedPnl <= 0).length;
  const totalTrades = completed.length;

  console.log(
    `[stats] computeWinRateFromOrders — completed trades: ${totalTrades}, wins: ${wins}, losses: ${losses}`,
  );

  return {
    wins,
    losses,
    totalTrades,
    winRate: totalTrades > 0 ? wins / totalTrades : null,
  };
}

// ---------------------------------------------------------------------------
// Completed trade records from raw Alpaca orders (FIFO lot matching)
// ---------------------------------------------------------------------------
// Same algorithm as computeWinRateFromOrders, but returns one record per
// completed round-trip trade with symbol, P&L, and open/close timestamps.

export interface CompletedTradeRecord {
  symbol: string;
  pnl: number;
  openedAt: Date;
  closedAt: Date;
  holdingDays: number;
}

export function computeTradeRecords(
  rawOrders: {
    symbol: string;
    side: string;
    status: string;
    filled_qty: string;
    filled_avg_price: string | null;
    filled_at: string | null;
  }[],
): CompletedTradeRecord[] {
  const orders = rawOrders
    .filter(
      (o) =>
        o.status === "filled" &&
        o.filled_at !== null &&
        parseFloat(o.filled_qty || "0") > 0,
    )
    .sort(
      (a, b) =>
        new Date(a.filled_at!).getTime() - new Date(b.filled_at!).getTime(),
    );

  const bySymbol = new Map<string, typeof orders>();
  for (const o of orders) {
    if (!bySymbol.has(o.symbol)) bySymbol.set(o.symbol, []);
    bySymbol.get(o.symbol)!.push(o);
  }

  interface Lot {
    qty: number;
    price: number;
    openedAt: Date;
  }

  const completed: CompletedTradeRecord[] = [];

  for (const [symbol, symOrders] of bySymbol.entries()) {
    let longLots: Lot[] = [];
    let shortLots: Lot[] = [];
    let currentPnl = 0;
    let currentOpenedAt: Date | null = null;

    const recordTrade = (closedAt: Date) => {
      if (currentOpenedAt) {
        const holdingDays = Math.round(
          (closedAt.getTime() - currentOpenedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        completed.push({ symbol, pnl: currentPnl, openedAt: currentOpenedAt, closedAt, holdingDays });
      }
      currentPnl = 0;
      currentOpenedAt = null;
    };

    const drainLots = (
      lots: Lot[],
      qty: number,
      closePrice: number,
      isLong: boolean,
    ): number => {
      let remaining = qty;
      while (remaining > 1e-8 && lots.length > 0) {
        const lot = lots[0];
        const fill = Math.min(remaining, lot.qty);
        currentPnl += isLong
          ? (closePrice - lot.price) * fill
          : (lot.price - closePrice) * fill;
        remaining -= fill;
        lot.qty -= fill;
        if (lot.qty < 1e-8) lots.shift();
      }
      return remaining;
    };

    for (const order of symOrders) {
      const qty = parseFloat(order.filled_qty);
      const price = parseFloat(order.filled_avg_price ?? "0");
      const filledAt = new Date(order.filled_at!);
      if (qty <= 0 || price <= 0) continue;

      if (order.side === "buy") {
        if (shortLots.length > 0) {
          const leftover = drainLots(shortLots, qty, price, false);
          if (shortLots.length === 0) {
            recordTrade(filledAt);
            if (leftover > 1e-8) {
              longLots.push({ qty: leftover, price, openedAt: filledAt });
              currentOpenedAt = filledAt;
            }
          }
        } else {
          if (!currentOpenedAt) currentOpenedAt = filledAt;
          longLots.push({ qty, price, openedAt: filledAt });
        }
      } else {
        if (longLots.length > 0) {
          const leftover = drainLots(longLots, qty, price, true);
          if (longLots.length === 0) {
            recordTrade(filledAt);
            if (leftover > 1e-8) {
              shortLots.push({ qty: leftover, price, openedAt: filledAt });
              currentOpenedAt = filledAt;
            }
          }
        } else {
          if (!currentOpenedAt) currentOpenedAt = filledAt;
          shortLots.push({ qty, price, openedAt: filledAt });
        }
      }
    }
  }

  console.log(`[stats] computeTradeRecords — completed trades: ${completed.length}`);
  return completed;
}

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
