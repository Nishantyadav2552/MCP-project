/**
 * rag/embedder.ts
 *
 * Vector embedding generator using Gemini embedding models and cosine similarity.
 */

import dotenv from "dotenv";
dotenv.config({ override: true });

const EMBEDDING_MODELS = [
  "gemini-embedding-001",
  "gemini-embedding-2-preview",
  "gemini-embedding-2",
];

const embeddingCache = new Map<string, number[]>();

/**
 * Fetch a vector embedding for a text string using the Gemini API.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  const normalized = text.trim().slice(0, 2048);
  if (!normalized) return null;

  if (embeddingCache.has(normalized)) {
    return embeddingCache.get(normalized)!;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  for (const model of EMBEDDING_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text: normalized }] },
        }),
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        embedding?: { values?: number[] };
      };

      const values = data.embedding?.values;
      if (values && values.length > 0) {
        embeddingCache.set(normalized, values);
        return values;
      }
    } catch {
      // Try next candidate model
    }
  }

  return null;
}

/**
 * Calculate cosine similarity between two numeric vectors.
 * Returns a value between -1.0 and 1.0 (1.0 = identical direction).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
