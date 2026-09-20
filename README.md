# FinWise

A RAG (Retrieval-Augmented Generation) app: upload financial aid and scholarship documents, then ask questions in plain English and get answers grounded only in what you uploaded, not the model's general "knowledge" (which it doesn't have about your specific documents anyway).

Built as a learning project to understand RAG mechanics end to end, and to be a genuinely useful tool for the very confusing world of financial aid rules. **The entire stack is free** — no credit card required anywhere.

An info button (ⓘ) in the header explains how to use the app, how it works, and what makes it different from a typical "chat with your PDF" tool, directly in the UI.

## Why RAG, and how it actually works

An LLM has no idea what's in your specific FAFSA guide or your specific scholarship's terms. Two bad options without RAG: ask it directly (it'll often confidently make something up), or paste the whole document into every prompt (falls apart past one short document).

RAG's approach: don't paste everything in, just find the *relevant* few paragraphs first.

**At upload time:**
1. **Chunk** — split the document into overlapping pieces (~220 words each, 30-word overlap) small enough to search individually. The overlap matters: a rule sitting exactly at a chunk boundary would otherwise get cut in half and might not be retrievable in either piece.
2. **Embed** — run each chunk through an embedding model, which turns it into a vector (a list of 1024 numbers). Chunks with similar *meaning* end up mathematically close together, even if they don't share the same words.
3. **Store** — save the text and its vector in Postgres, using the `pgvector` extension, which adds a native vector type and fast nearest-neighbor search to plain SQL.

**At question time:**
1. Embed the question with the same model.
2. Ask Postgres for the chunks whose vectors are closest to the question's vector (`ORDER BY embedding <=> query_vector` under the hood, via `pgvector`'s cosine-distance operator).
3. Hand those chunks to the LLM along with the question, and instruct it to answer *only* from what it was given, and to say so plainly if the excerpts don't actually answer the question rather than guessing.

The UI shows the actual retrieved chunks and their similarity scores under every answer, on purpose, so the mechanics stay visible instead of hidden behind a chat bubble.

## Stack (all free)

- **Next.js**, deployed on Vercel
- **Postgres + pgvector** for the vector database — a real production-legitimate choice, not a toy. A free [Neon](https://neon.tech) project supports the extension natively.
- **Cohere** (`embed-english-v3.0` for embeddings, `command-a-03-2025` for generation) — one API key, a free trial key generated automatically on signup, no card and no cloud-project setup required. Rate-limited to 1,000 API calls/month, which is plenty for building and demoing this (each question costs about 2 calls).
- **`pdf-parse`** for extracting text from uploaded PDFs (plain pasted text also works, no upload required)

## Getting started

1. Create a Postgres database — a free [Neon](https://neon.tech) project works, `pgvector` doesn't need any manual setup, the app runs `CREATE EXTENSION IF NOT EXISTS vector` itself on first request.
2. Get a free Cohere API key (no card, no cloud project needed) at [dashboard.cohere.com](https://dashboard.cohere.com) — a trial key is generated automatically the moment you sign up.
3. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` and `COHERE_API_KEY`.
4. `npm install && npm run dev`, then open [http://localhost:3000](http://localhost:3000).

### Deploying (Vercel)

Add `DATABASE_URL` and `COHERE_API_KEY` as environment variables in the Vercel project, then deploy.

## Project structure

```
src/
  app/
    page.tsx                 # Upload panel + ask panel, shows retrieved chunks + similarity scores
    api/ingest/                 # Upload a document: extract text, chunk, embed, store
    api/ask/                       # The RAG query: embed question, retrieve, generate
    api/documents/                    # List uploaded documents
  lib/
    chunking.ts               # Overlapping fixed-size chunking
    embeddings.ts                # Cohere embeddings wrapper (search_document vs search_query), auto-batches past 96 texts
    retrieval.ts                    # pgvector cosine-distance similarity search
    cohere.ts                          # Generation call: builds the grounded prompt, calls Cohere
  db/
    schema.ts                 # documents + chunks (chunks.embedding is a real pgvector column)
    index.ts                     # Postgres connection, pgvector extension + table bootstrap
```

## What this project doesn't do (yet) — the natural next phase

Right now, step 3 (generation) is trusted to only say things the retrieved chunks support, but nothing actually checks that. The model can still drift, misread a chunk, or state something with more confidence than the source gives it.

The planned next phase is a **verification layer**: after generating an answer, decompose it into individual factual claims and check each one back against the retrieved chunks to confirm it's actually supported, not just plausible. That's the harder, more valuable half of building something trustworthy in a high-stakes domain like financial aid, where a wrong answer has a real dollar cost, and it's the part most RAG tutorials skip entirely.

## A note on accuracy

The Cohere API calls in `lib/embeddings.ts` and `lib/cohere.ts` were built carefully against Cohere's current API documentation (the exact request/response shapes for both `/v2/embed` and `/v2/chat`), but couldn't be tested against a real API response in the environment this was built in (network-restricted sandbox). Everything else (chunking, the database layer, PDF parsing, the full request/response pipeline) was tested for real, including with a real uploaded PDF. If a Cohere call errors out on first real use, check the response shape against [Cohere's API reference](https://docs.cohere.com/reference/chat) first.
