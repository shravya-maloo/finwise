const EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents";
const DIMENSIONS = 768;

/**
 * Embeds a batch of text strings into vectors (arrays of 768 numbers each).
 *
 * `taskType` matters: Gemini's embedding model was trained knowing whether a
 * piece of text is being indexed ("RETRIEVAL_DOCUMENT") or searched for
 * ("RETRIEVAL_QUERY"). Passing the right one measurably improves retrieval
 * quality, since a question and its answer are phrased very differently
 * even when they mean the same thing.
 */
export async function embed(texts: string[], taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local (see .env.example).");
  }

  const res = await fetch(`${EMBED_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: DIMENSIONS,
      })),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini embeddings request failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data.embeddings.map((e: { values: number[] }) => e.values);
}

export async function embedOne(text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[]> {
  const [vector] = await embed([text], taskType);
  return vector;
}
