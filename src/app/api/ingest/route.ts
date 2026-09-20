import { NextRequest, NextResponse } from "next/server";
import { db, ensureReady } from "@/db";
import { documents, chunks } from "@/db/schema";
import { chunkText } from "@/lib/chunking";
import { embed } from "@/lib/embeddings";

// pdf-parse v2's API is class-based: new PDFParse({ data }).getText(). We
// import it lazily inside the handler (rather than at module scope) so it's
// only loaded on requests that actually need it.
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export async function POST(req: NextRequest) {
  await ensureReady();

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const text = form.get("text");
  const file = form.get("file");

  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  let rawText: string;
  try {
    if (file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      rawText = file.type === "application/pdf" ? await extractPdfText(buffer) : buffer.toString("utf-8");
    } else if (typeof text === "string" && text.trim()) {
      rawText = text;
    } else {
      return NextResponse.json({ error: "Provide either a file or pasted text." }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Could not read that file: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 400 }
    );
  }

  const pieces = chunkText(rawText);
  if (pieces.length === 0) {
    return NextResponse.json({ error: "That document had no extractable text." }, { status: 400 });
  }

  // Embed every chunk in one batched call rather than one request per chunk.
  // Voyage (like most embedding APIs) accepts a list of inputs per request,
  // which is both faster and cheaper than looping individual calls.
  const vectors = await embed(pieces, "search_document");

  const [doc] = await db.insert(documents).values({ title }).returning();

  await db.insert(chunks).values(
    pieces.map((content, i) => ({
      documentId: doc.id,
      chunkIndex: i,
      content,
      embedding: vectors[i],
    }))
  );

  return NextResponse.json({ documentId: doc.id, title: doc.title, chunkCount: pieces.length });
}
