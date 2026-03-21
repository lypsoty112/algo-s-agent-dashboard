import type { NextRequest } from "next/server";
import { cacheLife } from "next/cache";
import { db, safeQuery } from "@/lib/db";
import { Prisma } from "@/src/generated/prisma/client";

async function fetchStrategiesData(
  type: string | null,
  subject: string | null,
  showSuperseded: boolean
) {

  const where: Prisma.StrategyWhereInput = {};

  if (!showSuperseded) {
    where.deletedAt = null;
  }

  if (type) {
    where.type = { equals: type as Prisma.EnumStrategyTypeFilter["equals"] };
  }
  if (subject) {
    where.subject = {
      contains: subject,
      mode: "insensitive" as Prisma.QueryMode,
    };
  }

  const { data: rows } = await safeQuery(() =>
    db.strategy.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
  );

  const strategies = (rows ?? []).map((s) => ({
    ...s,
    superseded: s.deletedAt !== null,
  }));

  return { strategies, total: strategies.length };
}

async function getStrategiesData(
  type: string | null,
  subject: string | null,
  showSuperseded: boolean
) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  return fetchStrategiesData(type, subject, showSuperseded);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const subject = sp.get("subject");
  const showSuperseded = sp.get("showSuperseded") === "true";

  try {
    const data = await (process.env.DISABLE_CACHE === "true" && process.env.NODE_ENV !== "production"
      ? fetchStrategiesData(type, subject, showSuperseded)
      : getStrategiesData(type, subject, showSuperseded));
    return Response.json(data);
  } catch (err) {
    console.error("Strategies route error:", err);
    return Response.json(
      { error: "Failed to fetch strategies" },
      { status: 500 }
    );
  }
}
