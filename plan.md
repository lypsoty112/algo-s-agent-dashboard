# algo-s-dashboard — V1 Plan

## Overview

A Next.js investor dashboard for algo-s-agents. Gives external stakeholders a clear view of trading performance, open positions, and the system's knowledge base and strategies. Read-only — no writes to the database.

**Audience:** External investors / stakeholders
**Primary use case:** Evaluating trading performance and understanding system reasoning

---

## Tech Stack

| Technology | Role |
|---|---|
| Next.js | Framework |
| TypeScript | Language |
| Tailwind CSS v4 | Styling |
| shadcn/ui | UI component primitives |
| Prisma | DB access (read-only, shared schema from algo-s-agents) |
| Recharts | Charts (equity curve, scatter plot) |
| jose | JWT signing for auth cookies |
| Bun | Runtime and package manager |

---

## Navigation

Five top-level tabs:

1. **Overview** — system state at a glance
2. **Performance** — deep return and risk analysis
3. **Positions** — open and closed trades
4. **Knowledge Base** — raw KB explorer
5. **Strategies** — strategy explorer

---

## Tab Specs

### 1. Overview

**Purpose:** Reassure at a glance. Answer "is this working and is it making money?"

**KPI strip (4 cards)**
- Portfolio value (current equity from Alpaca)
- MTD return %
- Total return % since inception
- Win rate % (from closed trades in DB)

**Equity curve (left, wider)**
- Indexed to 100 at start date
- Your equity vs SPY vs QQQ
- Time toggle: 1M / 3M / 6M / 1Y / All
- Hover shows all three values at a given date

**System snapshot (right, narrower)**
- Active strategies count
- KB entries total + added in last 7 days
- Open positions count + total unrealized P&L
- Last trade date

**Edge cases**
- No trade history yet: KPI cards show `--`, equity curve shows flat line with note
- Alpaca API down: show last cached values with stale data warning badge

---

### 2. Performance

**Purpose:** Serious return analysis. Where an investor stress-tests the numbers.

**Section 1: Returns**

Monthly return table (full width):
- Columns: Month | Return % | SPY % | Delta vs SPY | Cumulative Return %
- Color coded: green positive, red negative, intensity scales with magnitude
- Current incomplete month shown in muted style with `(MTD)` label
- Footer row: totals / averages

Equity curve (full width, all-time default)

**Section 2: Trade statistics (two columns)**

Left — return metrics:
- Total return %, annualized return %, best month, worst month
- Max drawdown % with date range
- Average monthly return, % months positive

Right — trade metrics:
- Total trades, win rate %, avg winner $, avg loser $
- Profit factor (gross wins / gross losses)
- Avg holding period in days
- Largest single win $, largest single loss $

**Section 3: Risk metrics (three cards)**
- Sharpe ratio (annualized, 4.5% risk-free rate)
- Sortino ratio (downside deviation only)
- Max drawdown % with a small sparkline of the drawdown curve over time

**Section 4: Trade scatter plot**
- X axis: holding period in days
- Y axis: P&L %
- Each dot: one closed trade, colored green/red
- Hover: symbol, entry date, holding period, P&L %

**Edge cases**
- Fewer than 10 closed trades: Sharpe/Sortino show `--` with "Insufficient trade history" note
- All trades open: scatter plot shows empty state

---

### 3. Positions

Two sub-tabs within the page: **Open** and **Closed**.

**Open positions**

Table columns: Symbol | Direction | Size % | Entry Price | Current Price | Unrealized P&L $ | Unrealized P&L % | Days Held

- Size % = position market value / total portfolio value
- Direction pill: green `LONG` / red `SHORT`
- P&L % colored green/red
- Days held: amber highlight if > 14 days (default holding period threshold)
- Row click → drawer with full rationale, order details, Alpaca order ID

**Empty state:** "No open positions. The system is fully in cash." + current buying power

**Closed positions**

Table columns: Symbol | Direction | Entry Date | Exit Date | Days Held | P&L $ | P&L % | Status

- Filterable: date range, symbol search, win/loss toggle
- Sortable columns
- Paginated (20 per page)
- Row click → drawer with full rationale, entry + exit details side by side, Alpaca order IDs

**Edge cases**
- Position exists in Alpaca but no matching `trade_history` row: show Alpaca data with "No recorded rationale" warning badge
- Multiple filled rows for same symbol (scaled entry): aggregate in table, show all individual orders in drawer

---

### 4. Knowledge Base

**Purpose:** Raw explorer. Investors doing due diligence can browse everything the system has observed.

**Layout:** Two-panel — sticky filter sidebar (left) + entry list (right). Drawer for entry detail.

**Filter sidebar**
- Category: multi-select pill toggles for all 7 categories (`stock_specific`, `general_market`, `industry`, `mistakes`, `system`, `other`)
- Date range: from / to pickers
- Subject search: searches `subject` field
- Full text search: searches `description` field
- **Mistakes shortcut:** one-click button that filters directly to `category = mistakes`
- Entry count: "Showing 43 of 187 entries"

**Entry list**
- Sort: Newest / Oldest / Subject A–Z
- Each card: category pill + subject (bold) + full `description` text (Subject / Context / Key facts / Source) + created date
- Click → drawer

**Drawer**
- Header: category pill + subject
- Created / updated timestamps
- Full `description` (labeled sections)
- Divider
- Full `content` field (plain text, whitespace preserved)
- Badge: "Active position" if subject matches an open position symbol

**Pagination:** 25 entries per page

**Edge cases**
- Empty KB: "The system hasn't recorded any observations yet."
- No results: "No entries match your filters." + clear filters button
- Long content: no truncation — show everything

---

### 5. Strategies

**Purpose:** Show investors the actual trading rules the system operates by. The tab that builds the most trust.

**Layout:** Top filter bar + entry list. Drawer for detail.

**Filter bar**
- Type: pill toggles — `stock` / `industry` / `portfolio` / `risk_management` / `other`
- Subject search
- **Show superseded toggle:** off by default. When on, shows soft-deleted (old) strategy versions with a "Superseded" badge — lets investors see how the system's thinking evolved.

**Entry list**
- Each card: type pill + subject (bold) + description + created date
- Superseded entries: muted styling with "Superseded" badge (only when toggle is on)
- Click → drawer

**Drawer**
- Header: type + subject
- Created date; if superseded: superseded date + "Replaced by newer version" note
- Full `description` (labeled sections)
- Divider
- Full `content` field — rendered with generous text size and whitespace. This is the most important text in the dashboard. Entry/exit criteria, position sizing, risk parameters, holding periods should be clearly readable.
- Badge: "Active position" if subject matches an open position symbol

**Edge cases**
- No strategies: "No strategies have been established. The system builds these autonomously over time."
- Multiple versions of same strategy (show-superseded on): sort by created desc, newest first

---

## Repo Structure

```
algo-s-dashboard/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              # Password gate
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Tab nav + auth wrapper
│   │   ├── page.tsx                  # Overview tab
│   │   ├── performance/
│   │   │   └── page.tsx
│   │   ├── positions/
│   │   │   └── page.tsx
│   │   ├── knowledge-base/
│   │   │   └── page.tsx
│   │   └── strategies/
│   │       └── page.tsx
│   └── api/
│       ├── portfolio/route.ts        # Equity curve + history (Alpaca), revalidate: 300
│       ├── positions/route.ts        # Live positions + thesis (Alpaca + DB)
│       ├── trades/route.ts           # Closed trade history (DB)
│       ├── benchmark/route.ts        # SPY + QQQ (Alpaca Data), revalidate: 300
│       ├── knowledge-base/route.ts   # KB entries (DB, paginated + filtered)
│       └── strategies/route.ts       # Strategies (DB, inc. soft-deleted)
├── components/
│   ├── ui/                           # shadcn-generated primitives
│   ├── charts/
│   │   ├── equity-curve.tsx
│   │   ├── trade-scatter.tsx
│   │   └── monthly-returns.tsx
│   ├── kb/
│   │   └── entry-drawer.tsx          # Shared drawer: KB + Strategies + Positions
│   ├── positions/
│   │   └── position-drawer.tsx
│   └── nav.tsx                       # Top nav + last-updated badge
├── lib/
│   ├── alpaca.ts                     # Alpaca API client
│   ├── db.ts                         # Prisma client singleton (read-only)
│   └── stats.ts                      # Sharpe, Sortino, drawdown — server-side only
├── middleware.ts                      # Cookie check, redirects to /login
├── prisma/
│   └── schema.prisma                 # Copied/symlinked from algo-s-agents
└── .env.local                        # DASHBOARD_PASSWORD, DATABASE_URL, APCA_*, ALPACA_MODE
```

---

## Data Sources

| API Route | Sources | Cache |
|---|---|---|
| `api/portfolio` | Alpaca `getPortfolioHistory` | 300s |
| `api/benchmark` | Alpaca `getHistoricalPrices` (SPY, QQQ) | 300s |
| `api/positions` | Alpaca `getPositions` + Postgres `trade_history` | 60s |
| `api/trades` | Postgres `trade_history` | 60s |
| `api/knowledge-base` | Postgres `knowledge_base` | 60s |
| `api/strategies` | Postgres `strategies` | 60s |

---

## Auth

- Single `DASHBOARD_PASSWORD` environment variable
- `middleware.ts` checks for a signed JWT cookie on all `(dashboard)` routes
- `/login` page sets the cookie on correct password entry
- Cookie signed with `jose`, 7-day expiry
- No user table, no OAuth — single stakeholder use case

---

## Shared Components

**Drawer** — one component (`entry-drawer.tsx`) used across KB entries, strategies, open positions, and closed trades. Different props, same slide-in behavior, same close pattern (click outside or X).

**Nav** — last-updated timestamp shown in header on every tab. Investors need to know if they're looking at stale data.

**Empty states** — every table and list has a designed empty state. Not blank space.

**Loading states** — skeleton loaders, not spinners.

---

## Key Implementation Notes

**Benchmark normalization:** Normalize both series to 100 at `t=0` (first date with portfolio history). Never plot raw equity against raw SPY price.

**Sharpe/Sortino computation:** `getPortfolioHistory` returns equity values, not returns. Compute daily returns as `(equity[i] - equity[i-1]) / equity[i-1]` first. All stats in `lib/stats.ts`, server-side only.

**Thesis JOIN:** For open positions, `trade_history` may have multiple rows per symbol (scaled entries). Use the most recent non-cancelled row as the current thesis.

**Prisma read-only:** Never call mutating Prisma methods. Recommended: use a read-only Postgres user for the dashboard DB connection.

**Design language:** Matches algo-s-agents email identity — DM Sans / DM Serif Display / DM Mono font stack, dark header (`#0f1117`), warm neutral backgrounds (`#f5f3ef`), ⍺ mark in the nav. An investor who has seen the weekly newsletter should immediately recognize the dashboard.

---

## Build Order

| Step | What | Why this order |
|---|---|---|
| 1 | Scaffold + Prisma + env | Foundation |
| 2 | Auth (middleware + login page) | Everything else is blocked until auth works |
| 3 | API routes + `lib/stats.ts` | All data logic before touching UI |
| 4 | Nav + layout shell | Confirms routing end to end |
| 5 | Overview tab | First real data on screen, validates all integrations |
| 6 | Performance tab | Depends on `lib/stats.ts` being solid |
| 7 | Positions tab | Builds the drawer component (reused in steps 8–9) |
| 8 | Knowledge Base tab | Heaviest UI tab |
| 9 | Strategies tab | Reuses drawer from step 7 |
| 10 | Polish | Empty states, skeletons, error boundaries, mobile |

---

## Out of Scope (V1)

- Real-time updates (polling / websockets)
- Trade detail drilldown pages
- Activity / flow run feed
- Mobile-first optimization (responsive but not primary)