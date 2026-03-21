import { describe, expect, test, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

const mockFindMany = mock(() => Promise.resolve([]));
const mockCount = mock(() => Promise.resolve(0));
const mockSafeQuery = mock(async (fn: () => Promise<unknown>) => {
  try {
    const data = await fn();
    return { data, error: null };
  } catch {
    return { data: null, error: "error" };
  }
});

mock.module("@/lib/db", () => ({
  db: {
    knowledgeBase: {
      findMany: mockFindMany,
      count: mockCount,
    },
  },
  safeQuery: mockSafeQuery,
}));

mock.module("next/cache", () => ({
  cacheLife: mock(() => {}),
  cacheTag: mock(() => {}),
}));

describe("GET /api/knowledge-base", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockCount.mockReset();
    mockFindMany.mockReturnValue(Promise.resolve([]));
    mockCount.mockReturnValue(Promise.resolve(0));
  });

  test("returns empty result", async () => {
    const { GET } = await import("../../../app/api/knowledge-base/route");
    const req = new NextRequest("http://localhost/api/knowledge-base");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(25);
  });

  test("returns entries from db", async () => {
    const fakeEntry = {
      id: 1,
      category: "mistakes",
      subject: "Overtrading",
      description: "Traded too frequently",
      content: "Avoid overtrading during volatile periods",
      created_at: new Date("2024-03-01"),
    };
    mockFindMany.mockReturnValue(Promise.resolve([fakeEntry]));
    mockCount.mockReturnValue(Promise.resolve(1));

    const { GET } = await import("../../../app/api/knowledge-base/route");
    const req = new NextRequest("http://localhost/api/knowledge-base");
    const res = await GET(req);
    const body = await res.json();

    expect(body.total).toBe(1);
    expect(body.entries[0].subject).toBe("Overtrading");
  });

  test("passes category filter", async () => {
    const { GET } = await import("../../../app/api/knowledge-base/route");
    const req = new NextRequest(
      "http://localhost/api/knowledge-base?categories=stock_specific,mistakes"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    // Verify findMany was called (safeQuery wraps it)
    expect(mockSafeQuery).toHaveBeenCalled();
  });

  test("handles text search param", async () => {
    const { GET } = await import("../../../app/api/knowledge-base/route");
    const req = new NextRequest("http://localhost/api/knowledge-base?q=momentum");
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  test("paginates correctly", async () => {
    const { GET } = await import("../../../app/api/knowledge-base/route");
    const req = new NextRequest("http://localhost/api/knowledge-base?page=2");
    const res = await GET(req);
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(25);
  });
});
