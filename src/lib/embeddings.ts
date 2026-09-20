const EMBED_URL = "https://api.cohere.com/v2/embed";
const MODEL = "embed-english-v3.0";
const DIMENSIONS = 1024;
const MAX_TEXTS_PER_CALL = 96; // Cohere's Embed API limit per request

/**
 * Embeds a batch of text strings into vectors (arrays of 1024 numbers each).
 *
 * `inputType` matters: Cohere's embedding model was trained knowing whether
 * a piece of text is being indexed ("search_document") or searched for
 * ("search_query"). Passing the right one measurably improves retrieval
 * quality, since a question and its answer are phrased very differently
 * even when they mean the same thing.
 *
 * Cohere caps each request at 96 texts, so a document that chunks into more
 * pieces than that gets split into multiple calls automatically here rather
 * than failing on anything past the first 96 chunks.
 */
export async function embed(texts: string[], inputType: "search_document" | "search_query"): Promise<number[][]> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    throw new Error("COHERE_API_KEY is not set. Add it to .env.local (see .env.example).");
  }

  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_TEXTS_PER_CALL) {
    const batch = texts.slice(i, i + MAX_TEXTS_PER_CALL);

    const res = await fetch(EMBED_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        texts: batch,
        input_type: inputType,
        embedding_types: ["float"],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Cohere embeddings request failed: ${res.status} ${body}`);
    }

    const data = await res.json();
    results.push(...(data.embeddings.float as number[][]));
  }

  return results;
}

export async function embedOne(text: string, inputType: "search_document" | "search_query"): Promise<number[]> {
  const [vector] = await embed([text], inputType);
  return vector;
}

export { DIMENSIONS };
