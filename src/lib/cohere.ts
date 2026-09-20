import type { RetrievedChunk } from "./retrieval";

const CHAT_URL = "https://api.cohere.com/v2/chat";
const MODEL = "command-a-03-2025";

export async function callCohere(prompt: string): Promise<string> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    throw new Error("COHERE_API_KEY is not set. Add it to .env.local (see .env.example).");
  }

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cohere chat request failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data.message?.content?.[0]?.text ?? "";
}

/**
 * This is "augmented generation": the retrieved chunks are inserted directly
 * into the prompt, and the model is instructed to answer only from them.
 * It's still just a text prompt under the hood, no special API for RAG.
 * The instruction to say "I don't know" instead of guessing is what gives
 * the model permission to admit it lacks the answer instead of confidently
 * inventing one, which matters a lot for a domain like financial aid where
 * a wrong answer has real cost.
 */
export async function generateAnswer(question: string, sources: RetrievedChunk[]): Promise<string> {
  const context = sources
    .map((s, i) => `[Source ${i + 1}: ${s.documentTitle}]\n${s.content}`)
    .join("\n\n");

  const prompt = `You are answering a question about financial aid and scholarships using only the excerpts below. Do not use outside knowledge.

If the excerpts don't contain enough information to answer confidently, say so plainly rather than guessing. When you do answer, cite which source number(s) you used, like "(Source 2)".

Excerpts:
${context}

Question: ${question}`;

  const text = await callCohere(prompt);
  return text || "No answer generated.";
}
