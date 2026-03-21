import { Suspense } from "react";
import Image from "next/image";
import { connection } from "next/server";
import { cacheLife } from "next/cache";
import logo from "@/images/algo-s-logo.png";
import { LoginForm } from "./login-form";
import { db, safeQuery } from "@/lib/db";
import { getClosedOrdersCount, getPortfolioHistory } from "@/lib/alpaca";

type SystemStats = {
  totalPnlPct: number | null;
  closedOrders: number | null;
  kbEntries: number | null;
  strategies: number | null;
  lastAgentRun: Date | null;
  agentRunsLastMonth: number | null;
};

async function fetchSystemStats(): Promise<SystemStats> {
  console.log("[fetchSystemStats] called (uncached)");
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const [history, closedOrders, kbEntries, strategies, lastFlowRun, agentRunsLastMonth] =
    await Promise.all([
      getPortfolioHistory({ period: "1A", timeframe: "1D", pnl_reset: "no_reset" }).catch((e) => {
        console.error("[fetchSystemStats] portfolio history failed:", e);
        return null;
      }),
      getClosedOrdersCount(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      ).catch((e) => {
        console.error("[fetchSystemStats] closed orders failed:", e);
        return null;
      }),
      safeQuery(() => db.knowledgeBase.count({ where: { deletedAt: null } }), "kb-count"),
      safeQuery(() => db.strategy.count({ where: { deletedAt: null } }), "strategy-count"),
      safeQuery(
        () => db.flowRun.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
        "last-flow-run"
      ),
      safeQuery(
        () => db.agentRun.count({ where: { createdAt: { gte: oneMonthAgo } } }),
        "agent-runs-last-month"
      ),
    ]);

  const pnlPctArr = history?.profit_loss_pct;
  const lastPnlPct =
    pnlPctArr && pnlPctArr.length > 0 ? pnlPctArr[pnlPctArr.length - 1] : null;

  const result: SystemStats = {
    totalPnlPct: lastPnlPct != null ? lastPnlPct * 100 : null,
    closedOrders,
    kbEntries: kbEntries.data ?? null,
    strategies: strategies.data ?? null,
    lastAgentRun: lastFlowRun.data?.createdAt ?? null,
    agentRunsLastMonth: agentRunsLastMonth.data ?? null,
  };
  console.log("[fetchSystemStats] returning:", JSON.stringify(result));
  return result;
}

async function getSystemStats(): Promise<SystemStats> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  console.log("[getSystemStats] cache miss — fetching fresh");
  return fetchSystemStats();
}

function fmtRelative(date: Date | null): string {
  if (!date) return "--";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function fmtPct(value: number | null | undefined): string {
  if (value == null) return "--";
  const sign = value < 0 ? "-" : "+";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

// Separate async component so it can be wrapped in Suspense.
// connection() inside Suspense is required when DISABLE_CACHE bypasses 'use cache'.
async function StatsPanel() {
  const noCache = process.env.DISABLE_CACHE === "true" && process.env.NODE_ENV !== "production";
  console.log("[StatsPanel] rendering, DISABLE_CACHE:", noCache);
  if (noCache) await connection();
  const { totalPnlPct, closedOrders, kbEntries, strategies, lastAgentRun, agentRunsLastMonth } =
    await (noCache ? fetchSystemStats() : getSystemStats());
  console.log("[StatsPanel] stats received:", {
    totalPnlPct,
    closedOrders,
    kbEntries,
    strategies,
    lastAgentRun,
    agentRunsLastMonth,
  });

  const pnlPositive = totalPnlPct != null && totalPnlPct >= 0;

  const stats = [
    {
      label: "Realized P&L",
      value: fmtPct(totalPnlPct),
      positive: pnlPositive,
      colored: totalPnlPct != null,
      description: "Portfolio return (1Y)",
    },
    {
      label: "Closed Orders",
      value: closedOrders != null ? String(closedOrders) : "--",
      colored: false,
      description: "Orders closed this month",
    },
    {
      label: "Knowledge Base",
      value: kbEntries != null ? String(kbEntries) : "--",
      colored: false,
      description: "Memory entries written by the agent",
    },
    {
      label: "Active Strategies",
      value: strategies != null ? String(strategies) : "--",
      colored: false,
      description: "Live trading strategies",
    },
    {
      label: "Last Agent Run",
      value: fmtRelative(lastAgentRun),
      colored: false,
      description: lastAgentRun
        ? lastAgentRun.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "No runs recorded",
    },
    {
      label: "Agents (Last 30 Days)",
      value: agentRunsLastMonth != null ? agentRunsLastMonth.toLocaleString() : "--",
      colored: false,
      description: "Agent executions in the past month",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/8 bg-white/4 px-5 py-4 backdrop-blur-sm"
          >
            <p className="text-xs text-zinc-500 mb-2 leading-none">{stat.label}</p>
            <p
              className={`text-2xl font-semibold font-mono tracking-tight ${stat.colored
                ? stat.positive
                  ? "text-emerald-400"
                  : "text-red-400"
                : "text-white"
                }`}
            >
              {stat.value}
            </p>
            <p className="text-xs text-zinc-600 mt-1.5 leading-snug">{stat.description}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-600 mt-8 leading-relaxed">
        Data reflects real-time state of the algo-s autonomous trading system. All figures update
        continuously as the agent executes.
      </p>
    </>
  );
}

function StatsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div
            key={i}
            className="rounded-xl border border-white/8 bg-white/4 px-5 py-4 animate-pulse"
          >
            <div className="h-3 w-24 bg-white/10 rounded mb-3" />
            <div className="h-7 w-16 bg-white/10 rounded mb-2" />
            <div className="h-3 w-32 bg-white/10 rounded" />
          </div>
        ))}
      </div>
      <div className="h-3 w-64 bg-white/10 rounded mt-8 animate-pulse" />
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left — login panel */}
      <div className="flex flex-col justify-center items-center w-full lg:w-[42%] bg-background px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <Image src={logo} alt="algo-s logo" width={44} height={44} className="rounded-xl" />
            <div>
              <div className="text-lg font-semibold tracking-tight leading-none text-zinc-900">
                algo-s
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">Investor Dashboard</div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 leading-tight">
              Welcome back
            </h1>
            <p className="text-zinc-500 text-sm mt-2">
              Exclusive access.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>

      {/* Right — system stats panel */}
      <div className="hidden lg:flex  w-[58%]  px-1 py-1">
        <div className="bg-[#0f1117] w-full h-full px-12 py-12 rounded-2xl flex flex-col justify-center">
          <div className="max-w-lg">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
              System Status
            </p>
            <h2 className="text-2xl font-semibold text-white mb-8 tracking-tight">
              algo-s agents · live
            </h2>

            <Suspense fallback={<StatsSkeleton />}>
              <StatsPanel />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
