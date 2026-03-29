"use client";

import { Circle, CircleDot, CheckCircle2, CircleOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TodoItem, TodoStatus } from "@/lib/extract-todos";

const STATUS_ICON: Record<TodoStatus, React.ReactNode> = {
  pending: <Circle className="size-3.5 shrink-0 text-muted-foreground" />,
  in_progress: <CircleDot className="size-3.5 shrink-0 text-amber-500" />,
  completed: <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />,
  skipped: <CircleOff className="size-3.5 shrink-0 text-muted-foreground/50" />,
};

export function TodoPanel({ todos }: { todos: TodoItem[] }) {
  if (todos.length === 0) return null;

  const completed = todos.filter((t) => t.status === "completed").length;

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="px-3 py-2 pb-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Checklist</CardTitle>
          <Badge variant="secondary" className="font-mono text-xs">
            {completed}/{todos.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <ul className="space-y-1.5">
          {todos.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span className="mt-0.5">{STATUS_ICON[item.status]}</span>
              <span
                className={`text-xs font-mono leading-snug ${
                  item.status === "skipped"
                    ? "line-through text-muted-foreground/50"
                    : item.status === "completed"
                      ? "text-muted-foreground"
                      : "text-foreground"
                }`}
              >
                {item.title}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
