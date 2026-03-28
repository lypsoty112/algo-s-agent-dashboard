import type { NextRequest } from "next/server";
import { cacheLife } from "next/cache";
import { db, safeQuery } from "@/lib/db";
import { Prisma } from "@/src/generated/prisma/client";

const PAGE_SIZE = 25;

async function fetchKnowledgeBaseData(
  page: number,
  categories: string[],
  from: string | null,
  to: string | null,
  subject: string | null,
  q: string | null
) {

  const where: Prisma.KnowledgeBaseWhereInput = {
    deletedAt: null,
  };

  if (categories.length > 0) {
    where.category = { in: categories as Prisma.EnumKnowledgeBaseCategoryFilter["in"] };
  }
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }
  if (subject) {
    where.subject = {
      contains: subject,
      mode: "insensitive" as Prisma.QueryMode,
    };
  }
  if (q) {
    where.OR = [
      { subject: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
      { content: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
      { description: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
    ];
  }

  const offset = (page - 1) * PAGE_SIZE;

  const [entries, total] = await Promise.all([
    safeQuery(() =>
      db.knowledgeBase.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: PAGE_SIZE,
      })
    ),
    safeQuery(() => db.knowledgeBase.count({ where })),
  ]);

  return {
    entries: entries.data ?? [],
    total: total.data ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

async function getCachedKnowledgeBaseData(
  page: number,
  categories: string[],
  from: string | null,
  to: string | null,
  subject: string | null,
  q: string | null
) {
  "use cache";
  cacheLife("frequent");
  return fetchKnowledgeBaseData(page, categories, from, to, subject, q);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rawPage = parseInt(sp.get("page") ?? "1", 10);
  const page = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);
  const categoriesRaw = sp.get("categories");
  const categories = categoriesRaw
    ? categoriesRaw.split(",").map((c) => c.trim()).filter(Boolean)
    : [];
  const from = sp.get("from");
  const to = sp.get("to");
  const subject = sp.get("subject");
  const q = sp.get("q");

  try {
    const data = await getCachedKnowledgeBaseData(page, categories, from, to, subject, q);
    return Response.json(data);
  } catch (err) {
    console.error("Knowledge base route error:", err);
    return Response.json(
      { error: "Failed to fetch knowledge base entries" },
      { status: 500 }
    );
  }
}
