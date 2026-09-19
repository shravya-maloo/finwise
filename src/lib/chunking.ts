/**
 * Splits text into overlapping chunks, roughly by word count.
 *
 * Why overlap matters: if a sentence explaining an eligibility rule gets
 * cut exactly in half between chunk N and chunk N+1, neither chunk alone
 * contains the full idea, and retrieval might miss it. A ~15% overlap means
 * the tail of one chunk reappears at the start of the next, so a rule
 * sitting right at a chunk boundary still gets captured whole in at least
 * one chunk.
 *
 * Real systems often chunk by semantic boundaries (paragraphs, headers)
 * instead of a raw word count. This fixed-size approach is simpler to
 * reason about while learning, and works fine for policy-style documents
 * that are already broken into short paragraphs.
 */
export function chunkText(text: string, chunkSize = 220, overlap = 30): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - overlap;
  }

  return chunks;
}
