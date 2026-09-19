import { NextRequest, NextResponse } from "next/server";
import { retrieveRelevantChunks } from "@/lib/retrieval";
import { generateAnswer } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question = String(body?.question ?? "").trim();

  if (!question) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }

  try {
    // Step 1: retrieval. Find the chunks most relevant to this question.
    const sources = await retrieveRelevantChunks(question, 5);

    if (sources.length === 0) {
      return NextResponse.json({
        answer: "No documents have been uploaded yet, so there's nothing to search.",
        sources: [],
      });
    }

    // Step 2: augmented generation. Hand those chunks to Claude along with
    // the question, and let it answer using only what it was given.
    const answer = await generateAnswer(question, sources);

    return NextResponse.json({
      answer,
      sources: sources.map((s) => ({
        documentTitle: s.documentTitle,
        similarity: Math.round(s.similarity * 1000) / 1000,
        excerpt: s.content.slice(0, 220) + (s.content.length > 220 ? "..." : ""),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong." },
      { status: 502 }
    );
  }
}
