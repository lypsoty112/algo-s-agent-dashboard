# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
bun dev          # Start dev server
bun build        # Production build
bun lint         # ESLint
```

> **Bun** is the runtime and package manager. Use `bun add` / `bun remove`, not npm/pnpm/yarn.

## What This Is

Read-only investor dashboard for the algo-s-agents trading system. External stakeholders view trading performance, open positions, and the system's knowledge base and strategies. No writes to the database.

## Planned Stack

| Package | Role |
|---|---|
| Next.js 16 (App Router) | Framework |
| Tailwind CSS v4 | Styling |
| shadcn/ui | UI primitives |
| Prisma | DB access — **read-only** |
| Recharts | Charts |
| `jose` | JWT signing for auth cookies |

## Architecture

### Route Groups

```
app/
  (auth)/login/page.tsx          # Password gate
  (dashboard)/
    layout.tsx                   # Tab nav + cookie auth check
    page.tsx                     # Overview tab
    performance/page.tsx
    positions/page.tsx
    knowledge-base/page.tsx
    strategies/page.tsx
  api/
    portfolio/route.ts           # Alpaca equity history, revalidate 300s
    benchmark/route.ts           # SPY + QQQ via Alpaca, revalidate 300s
    positions/route.ts           # Live positions (Alpaca) + thesis (DB), revalidate 60s
    trades/route.ts              # Trade rationale/thesis from DB (paginated, for Positions tab) — NOT for performance stats; use Alpaca orders for those
    knowledge-base/route.ts      # KB entries, paginated + filtered, revalidate 60s
    strategies/route.ts          # Strategies incl. soft-deleted, revalidate 60s
```

### Key `lib/` Files

- `lib/alpaca.ts` — Alpaca API client
- `lib/db.ts` — Prisma client singleton (read-only Postgres user)
- `lib/stats.ts` — Sharpe, Sortino, drawdown calculations — **server-side only**

### Auth

Single-password auth via `DASHBOARD_PASSWORD` env var. `middleware.ts` (or `proxy.ts` in Next.js 16) checks for a signed `jose` JWT cookie on all `(dashboard)` routes. Cookie has 7-day expiry. No user table.

> **Note:** Next.js 16 renames `middleware.ts` → `proxy.ts`. Place at project root alongside `app/`.

### Shared Components

- **`components/kb/entry-drawer.tsx`** — one drawer reused across KB entries, strategies, open positions, and closed trades
- **`components/nav.tsx`** — top nav with last-updated badge (stale data indicator)
- Skeleton loaders (not spinners) for loading states; every list/table has a designed empty state

## Data Source Rules

> **The single most common mistake: using `trade_history` (DB) for trading stats. Don't. Use Alpaca.**

| Data | Source | How |
|---|---|---|
| Equity curve | Alpaca | `getPortfolioHistory()` |
| Open positions | Alpaca | `getPositions()` |
| Closed trades — P&L, win rate, holding period | Alpaca | `getRecentOrders()` → `computeTradeRecords()` / `computeWinRateFromOrders()` in `lib/stats.ts` |
| Last trade date | Alpaca | first `filled_at` from `getRecentOrders()` |
| Knowledge base entries | DB (Prisma) | `db.knowledgeBase` |
| Strategies | DB (Prisma) | `db.strategy` |
| Trade rationale / thesis text | DB (Prisma) | `db.tradeHistory` — **agent notes only, not trading activity** |
| Flow / agent run logs | DB (Prisma) | `db.flowRun`, `db.agentRun` |

**`trade_history` is LLM memory, not a trade ledger.** The agent writes its rationale and post-trade notes there. It does NOT reliably contain P&L, filled quantities, or timestamps suitable for performance stats. Always use Alpaca order data for anything quantitative (P&L, win rate, holding periods, scatter plots, stat cards).

## Critical Implementation Rules

- **Prisma is read-only.** Never call mutating Prisma methods. Use a read-only Postgres user.
- **Schema resilience:** The database schema is owned by `algo-s-agents` and can change at any time. All Prisma queries must be wrapped in try/catch. Missing columns or changed types should degrade gracefully (show `--` or "Data unavailable") rather than crash the dashboard. Never assume a column exists at the type level without handling the case where the query fails at runtime.
- **Benchmark normalization:** Normalize both equity and SPY/QQQ to 100 at `t=0`. Never plot raw equity vs raw index price.
- **Stats computation:** `getPortfolioHistory` returns equity values, not returns. Compute daily returns as `(equity[i] - equity[i-1]) / equity[i-1]` before calculating Sharpe/Sortino. All stats stay in `lib/stats.ts` (server-side only).
- **Thesis JOIN:** `trade_history` may have multiple rows per symbol (scaled entries). Use the most recent non-cancelled row as the current thesis for open positions.
- **Fewer than 10 closed trades:** Sharpe/Sortino display `--` with "Insufficient trade history" note.

## Design Language

Matches the algo-s-agents email identity: **DM Sans / DM Mono** font stack (already in `layout.tsx`), dark header (`#0f1117`), warm neutral backgrounds (`#f5f3ef`), ⍺ mark in the nav. An investor familiar with the weekly newsletter should immediately recognize the dashboard.

## Environment Variables

See `.env.example`. Required:

| Variable | Purpose |
|---|---|
| `APCA_API_KEY_ID` | Alpaca API key |
| `APCA_API_SECRET_KEY` | Alpaca API secret |
| `DASHBOARD_PASSWORD` | Single password for auth |
| `DATABASE_URL` | Postgres connection (read-only user recommended) |
| `TZ` | Timezone |

## Prisma Schema

`prisma/schema.prisma` is copied/symlinked from the `algo-s-agents` repo. Don't modify the schema here — it's owned by the agent system.

**Never run migrations.** Prisma is used here for type generation and query building only. The database is managed entirely by the `algo-s-agents` system. Never run `prisma migrate`, `prisma db push`, `prisma db execute`, or any other command that writes to or alters the database schema.
