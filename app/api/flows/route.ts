import type { NextRequest } from "next/server";
import { cacheLife } from "next/cache";
import { db, safeQuery } from "@/lib/db";
import type { Prisma } from "@/src/generated/prisma/client";

const PAGE_SIZE = 20;

async function fetchFlowsData(page: number, status: string | null) {
  const where: Prisma.FlowRunWhereInput = {
    deletedAt: null,
  };

  if (status) {
    where.status = status as Prisma.EnumRunStatusFilter["equals"];
  }

  const offset = (page - 1) * PAGE_SIZE;

  const [flows, total] = await Promise.all([
    safeQuery(() =>
      db.flowRun.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: offset,
        take: PAGE_SIZE,
        include: {
          _count: { select: { agentRuns: true } },
        },
      })
    ),
    safeQuery(() => db.flowRun.count({ where })),
  ]);

  return {
    flows: flows.data ?? [],
    total: total.data ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

async function getCachedFlowsData(page: number, status: string | null) {
  "use cache";
  cacheLife("frequent");
  return fetchFlowsData(page, status);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rawPage = parseInt(sp.get("page") ?? "1", 10);
  const page = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);
  const status = sp.get("status");

  try {
    const data = await getCachedFlowsData(page, status);
    return Response.json(data);
  } catch (err) {
    console.error("Flows route error:", err);
    return Response.json(
      { error: "Failed to fetch flow runs" },
      { status: 500 }
    );
  }
}
