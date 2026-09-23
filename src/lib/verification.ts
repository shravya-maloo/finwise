import type { RetrievedChunk } from "./retrieval";
import { callCohere } from "./cohere";

export type ClaimStatus = "supported" | "partial" | "unsupported";

export type VerifiedClaim = {
  claim: string;
  status: ClaimStatus;
  reason: string;
};

/**
 * Strips a ```json ... ``` fence if the model wrapped its output in one
 * (a common habit even when explicitly told not to), so JSON.parse doesn't
 * choke on the fence markers.
 */
function stripCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : text.trim();
}

/**
 * Step 1 of verification: ask the model what distinct factual claims it
 * just made. This is a separate call from the original answer generation
 * on purpose — asking a model to critique its own still-fresh output in
 * the same turn tends to just re-confirm it, whereas a fresh call treats
 * the answer as text to analyze rather than something it just committed to.
 */
async function decomposeIntoClaims(answer: string): Promise<string[]> {
  const prompt = `List the distinct factual claims made in the following answer. Return ONLY a JSON array of strings, nothing else, no markdown formatting.

If the answer says something like "I don't know" or explicitly states it lacks enough information, return an empty array, since there's no factual claim to check.

Answer:
${answer}`;

  const raw = await callCohere(prompt);
  try {
    const parsed = JSON.parse(stripCodeFence(raw));
    if (Array.isArray(parsed)) return parsed.filter((c): c is string => typeof c === "string");
  } catch {
    // fall through to empty result below
  }
  return [];
}

/**
 * Step 2: for each claim, check it against the actual retrieved chunks
 * (not the answer, not the model's memory) and classify it. Batched into
 * one call for all claims rather than one call per claim, both for cost
 * and because giving the model every claim at once lets it stay consistent
 * about what the sources do and don't say.
 */
async function verifyClaims(claims: string[], sources: RetrievedChunk[]): Promise<VerifiedClaim[]> {
  if (claims.length === 0) return [];

  const context = sources.map((s, i) => `[Source ${i + 1}]\n${s.content}`).join("\n\n");
  const claimList = claims.map((c, i) => `${i + 1}. ${c}`).join("\n");

  const prompt = `You are fact-checking claims against source text. For each claim below, decide whether the source excerpts fully support it, partially support it, or don't support it at all. Be strict: a claim is only "supported" if the excerpts actually say it, not if it merely sounds plausible.

Return ONLY a JSON array, nothing else, no markdown formatting, with one object per claim in this exact shape:
[{"claim": "...", "status": "supported" | "partial" | "unsupported", "reason": "one short sentence"}]

Claims:
${claimList}

Source excerpts:
${context}`;

  const raw = await callCohere(prompt);
  try {
    const parsed = JSON.parse(stripCodeFence(raw));
    if (Array.isArray(parsed)) {
      return parsed
        .filter((c) => c && typeof c.claim === "string" && typeof c.status === "string")
        .map((c) => ({
          claim: c.claim,
          status: (["supported", "partial", "unsupported"].includes(c.status) ? c.status : "unsupported") as ClaimStatus,
          reason: typeof c.reason === "string" ? c.reason : "",
        }));
    }
  } catch {
    // fall through
  }
  // If verification itself fails to parse, don't silently claim everything
  // is fine — mark each claim unverifiable so the UI can say so honestly.
  return claims.map((claim) => ({ claim, status: "unsupported" as ClaimStatus, reason: "Could not verify (verification step failed)." }));
}

export async function verifyAnswer(answer: string, sources: RetrievedChunk[]): Promise<VerifiedClaim[]> {
  const claims = await decomposeIntoClaims(answer);
  return verifyClaims(claims, sources);
}
