import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
}

const globalForDb = globalThis as unknown as { __clearaidSql?: ReturnType<typeof postgres> };

const sql = globalForDb.__clearaidSql ?? postgres(connectionString, { max: 1 });
if (process.env.NODE_ENV !== "production") {
  globalForDb.__clearaidSql = sql;
}

let bootstrapped = false;

async function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  // pgvector is a Postgres extension, not built in by default. This turns on
  // the `vector` column type and the distance operators (<=>, <->, etc.)
  // that make similarity search possible with plain SQL.
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chunks (
      id SERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding VECTOR(768) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // An HNSW index lets Postgres find "closest vectors" without scanning
  // every row. Not strictly necessary at the scale this project will run
  // at (a full scan is fine for a few thousand chunks), but this is how a
  // real production RAG system stays fast as the document set grows, so
  // it's worth having in place from the start.
  await sql`
    CREATE INDEX IF NOT EXISTS idx_chunks_embedding
    ON chunks USING hnsw (embedding vector_cosine_ops)
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id)`;
}

const readyPromise = bootstrap();

export async function ensureReady() {
  await readyPromise;
}

export const db = drizzle(sql, { schema });
export { sql as rawSql };
