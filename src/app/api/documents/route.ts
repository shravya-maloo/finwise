import { NextResponse } from "next/server";
import { db, ensureReady } from "@/db";
import { documents, chunks } from "@/db/schema";
import { count, desc } from "drizzle-orm";

export async function GET() {
  await ensureReady();

  const docs = await db.select().from(documents).orderBy(desc(documents.id));
  const counts = await db.select({ documentId: chunks.documentId, value: count() }).from(chunks).groupBy(chunks.documentId);
  const countMap = new Map(counts.map((c) => [c.documentId, Number(c.value)]));

  return NextResponse.json({
    documents: docs.map((d) => ({ id: d.id, title: d.title, chunkCount: countMap.get(d.id) ?? 0 })),
  });
}
