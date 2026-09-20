import { pgTable, serial, text, timestamp, integer, vector } from "drizzle-orm/pg-core";

// One row per uploaded document (a PDF, or pasted text).
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per chunk of a document. `embedding` is the actual vector: a list
// of 1024 numbers produced by the embedding model, one per chunk. This is
// the column pgvector knows how to search efficiently.
export const chunks = pgTable("chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Document = typeof documents.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
