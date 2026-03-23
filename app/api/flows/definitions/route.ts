import { cacheLife } from "next/cache";
import { CronExpressionParser } from "cron-parser";
import { db, safeQuery } from "@/lib/db";

const TZ = process.env.TZ || "America/New_York";

type FlowInfo = {
  triggerConstraints?: {
    schedule?: string;
    runAt?: string;
  };
};

function parseFlowInfo(raw: unknown): FlowInfo {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as FlowInfo;
  }
  return {};
}

type ScheduleResult =
  | { type: "cron"; nextRunAt: Date; schedule: string }
  | { type: "one-off"; nextRunAt: Date | null; schedule: string }
  | { type: "none" };

function computeSchedule(info: FlowInfo): ScheduleResult {
  const constraints = info?.triggerConstraints;
  if (!constraints) return { type: "none" };

  const { schedule, runAt } = constraints;

  if (schedule) {
    try {
      const interval = CronExpressionParser.parse(schedule, {
        tz: TZ,
        currentDate: new Date(),
      });
      const nextRunAt = interval.next().toDate();
      return { type: "cron", nextRunAt, schedule };
    } catch {
      return { type: "none" };
    }
  }

  if (runAt) {
    const runAtDate = new Date(runAt);
    const nextRunAt = runAtDate > new Date() ? runAtDate : null;
    return { type: "one-off", nextRunAt, schedule: runAt };
  }

  return { type: "none" };
}

async function fetchDefinitions() {
  const result = await safeQuery(() =>
    db.flow.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    })
  );

  const flows = result.data ?? [];
  const totalCount = flows.length;
  const activeCount = flows.filter((f) => f.enabled).length;

  let cronCount = 0;
  let oneOffCount = 0;
  let nextRun: { flowName: string; scheduledAt: string } | null = null;

  const flowsOut = flows.map((flow) => {
    const info = parseFlowInfo(flow.info);
    const sched = computeSchedule(info);

    if (sched.type === "cron") {
      cronCount++;
      if (
        flow.enabled &&
        (!nextRun || sched.nextRunAt < new Date(nextRun.scheduledAt))
      ) {
        nextRun = { flowName: flow.name, scheduledAt: sched.nextRunAt.toISOString() };
      }
      return {
        id: flow.id,
        name: flow.name,
        enabled: flow.enabled,
        scheduleType: "cron" as const,
        nextRunAt: sched.nextRunAt.toISOString(),
        schedule: sched.schedule,
      };
    }

    if (sched.type === "one-off") {
      oneOffCount++;
      if (
        flow.enabled &&
        sched.nextRunAt &&
        (!nextRun || sched.nextRunAt < new Date(nextRun.scheduledAt))
      ) {
        nextRun = { flowName: flow.name, scheduledAt: sched.nextRunAt.toISOString() };
      }
      return {
        id: flow.id,
        name: flow.name,
        enabled: flow.enabled,
        scheduleType: "one-off" as const,
        nextRunAt: sched.nextRunAt?.toISOString() ?? null,
        schedule: sched.schedule,
      };
    }

    return {
      id: flow.id,
      name: flow.name,
      enabled: flow.enabled,
      scheduleType: "none" as const,
      nextRunAt: null,
      schedule: null,
    };
  });

  return {
    activeCount,
    totalCount,
    nextRun,
    cronCount,
    oneOffCount,
    flows: flowsOut,
  };
}

async function getCachedDefinitions() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 600 });
  return fetchDefinitions();
}

export async function GET() {
  try {
    const data = await (
      process.env.DISABLE_CACHE === "true" && process.env.NODE_ENV !== "production"
        ? fetchDefinitions()
        : getCachedDefinitions()
    );
    return Response.json(data);
  } catch (err) {
    console.error("Flow definitions route error:", err);
    return Response.json({ error: "Failed to fetch flow definitions" }, { status: 500 });
  }
}
