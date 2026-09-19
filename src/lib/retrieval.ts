import { db, ensureReady } from "@/db";
import { chunks, documents } from "@/db/schema";
import { cosineDistance, eq } from "drizzle-orm";
import { embedOne } from "./embeddings";

export type RetrievedChunk = {
  content: string;
  documentTitle: string;
  documentId: number;
  similarity: number;
};

/**
 * Embeds the question, then asks Postgres for the `limit` chunks whose
 * vectors are closest to it by cosine distance.
 *
 * Cosine distance ranges 0 (identical direction, i.e. same meaning) to 2
 * (opposite meaning); we convert it to a 0-1 "similarity" score (1 = best)
 * since that's more intuitive to reason about and display.
 */
export async function retrieveRelevantChunks(question: string, limit = 5): Promise<RetrievedChunk[]> {
  await ensureReady();

  const queryVector = await embedOne(question, "RETRIEVAL_QUERY");
  const distance = cosineDistance(chunks.embedding, queryVector);

  const rows = await db
    .select({
      content: chunks.content,
      documentId: chunks.documentId,
      documentTitle: documents.title,
      distance,
    })
    .from(chunks)
    .innerJoin(documents, eq(chunks.documentId, documents.id))
    .orderBy(distance)
    .limit(limit);

  return rows.map((r) => ({
    content: r.content,
    documentId: r.documentId,
    documentTitle: r.documentTitle,
    similarity: 1 - Number(r.distance),
  }));
}
