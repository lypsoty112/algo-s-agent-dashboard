"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Brain, TrendingUp, Clock } from "lucide-react"

type SystemSnapshotProps = {
  activeStrategies: number | null
  kbTotal: number | null
  kbRecent: number | null
  openPositions: number | null
  unrealizedPnl: number | null
  lastTradeDate: string | null
}

function formatPnl(value: number): string {
  const sign = value >= 0 ? "+" : "-"
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000),
  )

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function SystemSnapshot({
  activeStrategies,
  kbTotal,
  kbRecent,
  openPositions,
  unrealizedPnl,
  lastTradeDate,
}: SystemSnapshotProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">System</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          <div className="flex items-start gap-3 pb-5">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Active Strategies</p>
              <p className="mt-1 font-mono text-2xl font-semibold">
                {activeStrategies !== null ? activeStrategies : "--"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 py-5">
            <Brain className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Knowledge Base</p>
              <p className="mt-1 font-mono text-2xl font-semibold">
                {kbTotal !== null ? kbTotal : "--"}
              </p>
              {kbRecent !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  +{kbRecent} in last 7d
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 py-5">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Open Positions</p>
              <p className="mt-1 font-mono text-2xl font-semibold">
                {openPositions !== null ? openPositions : "--"}
              </p>
              {unrealizedPnl !== null && (
                <p
                  className={`mt-1 font-mono text-xs ${unrealizedPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {formatPnl(unrealizedPnl)} unrealized
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 pt-5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Last Trade</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {lastTradeDate ? formatRelativeDate(lastTradeDate) : "--"}
              </p>
              {lastTradeDate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(lastTradeDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
