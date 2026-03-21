import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  console.log("[db] createPrismaClient called, DATABASE_URL present:", !!connectionString);
  if (!connectionString) {
    console.warn("[db] WARNING: DATABASE_URL is not set — DB queries will fail");
    const adapter = new PrismaPg({ connectionString: "postgresql://localhost/placeholder" });
    return new PrismaClient({ adapter });
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();
console.log("[db] singleton ready, reused existing:", !!globalForPrisma.prisma);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export async function safeQuery<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ data: T | null; error: string | null }> {
  const tag = label ? `[safeQuery:${label}]` : "[safeQuery]";
  console.log(`${tag} starting`);
  try {
    const data = await fn();
    console.log(`${tag} success:`, JSON.stringify(data));
    return { data, error: null };
  } catch (err) {
    console.error(`${tag} FAILED:`, err);
    return { data: null, error: "Data unavailable" };
  }
}
