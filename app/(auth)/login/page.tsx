export const dynamic = "force-dynamic";

import Image from "next/image";
import logo from "@/images/algo-s-logo.png";
import { LoginForm } from "./login-form";
import { db, safeQuery } from "@/lib/db";

async function getSystemStats() {
  const [pnl, openPositions, kbEntries, strategies] = await Promise.all([
    safeQuery(() =>
      db.trade_history.aggregate({
        _sum: { pnl: true },
        where: { status: "closed" },
      })
    ),
    safeQuery(() =>
      db.trade_history.count({ where: { status: "open" } })
    ),
    safeQuery(() => db.knowledge_base.count()),
    safeQuery(() =>
      db.strategies.count({ where: { deleted_at: null } })
    ),
  ]);

  return { pnl, openPositions, kbEntries, strategies };
}

function fmt(value: number | null | undefined, prefix = ""): string {
  if (value == null) return "--";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "+";
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${prefix}${abs.toFixed(2)}`;
}

export default async function LoginPage() {
  const { pnl, openPositions, kbEntries, strategies } = await getSystemStats();

  const totalPnl = pnl.data?._sum?.pnl ?? null;
  const pnlPositive = totalPnl != null && totalPnl >= 0;

  const stats = [
    {
      label: "Total Realized P&L",
      value: fmt(totalPnl, "$"),
      positive: pnlPositive,
      colored: totalPnl != null,
      description: "Across all closed trades",
    },
    {
      label: "Open Positions",
      value: openPositions.data != null ? String(openPositions.data) : "--",
      colored: false,
      description: "Currently held by the agent",
    },
    {
      label: "Knowledge Base",
      value: kbEntries.data != null ? String(kbEntries.data) : "--",
      colored: false,
      description: "Memory entries written by the agent",
    },
    {
      label: "Active Strategies",
      value: strategies.data != null ? String(strategies.data) : "--",
      colored: false,
      description: "Live trading strategies",
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left — login panel */}
      <div className="flex flex-col justify-center items-center w-full lg:w-[42%] bg-[#f5f3ef] px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <Image
              src={logo}
              alt="algo-s logo"
              width={44}
              height={44}
              className="rounded-xl"
            />
            <div>
              <div className="text-lg font-semibold tracking-tight leading-none text-zinc-900">
                algo-s
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Investor Dashboard
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 leading-tight">
              Welcome back
            </h1>
            <p className="text-zinc-500 text-sm mt-2">
              Exclusive access — enter your password to continue.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>

      {/* Right — system stats panel */}
      <div className="hidden lg:flex flex-col justify-center w-[58%] bg-[#0f1117] px-12 py-12">
        <div className="max-w-lg">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
            System Status
          </p>
          <h2 className="text-2xl font-semibold text-white mb-8 tracking-tight">
            algo-s agents · live
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/8 bg-white/4 px-5 py-4 backdrop-blur-sm"
              >
                <p className="text-xs text-zinc-500 mb-2 leading-none">
                  {stat.label}
                </p>
                <p
                  className={`text-2xl font-semibold font-mono tracking-tight ${
                    stat.colored
                      ? stat.positive
                        ? "text-emerald-400"
                        : "text-red-400"
                      : "text-white"
                  }`}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-zinc-600 mt-1.5 leading-snug">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p className="text-xs text-zinc-600 mt-8 leading-relaxed">
            Data reflects real-time state of the algo-s autonomous trading system.
            All figures update continuously as the agent executes.
          </p>
        </div>
      </div>
    </div>
  );
}
