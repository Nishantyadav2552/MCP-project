/**
 * rag/retriever.ts
 *
 * Hybrid vector + keyword retriever for design knowledge items.
 */

import { DESIGN_KNOWLEDGE_BASE } from "./knowledge-base";
import { getEmbedding, cosineSimilarity } from "./embedder";
import type { DesignKnowledgeItem, RetrievalResult } from "./types";

let isIndexed = false;
let isIndexingInProgress = false;

/**
 * Pre-compute embeddings for all knowledge base items in the background.
 */
export async function initializeKnowledgeIndex(): Promise<void> {
  if (isIndexed || isIndexingInProgress) return;
  isIndexingInProgress = true;

  try {
    const unindexed = DESIGN_KNOWLEDGE_BASE.filter((item) => !item.embedding);
    await Promise.all(
      unindexed.map(async (item) => {
        try {
          const textToEmbed = `${item.title}: ${item.summary} Keywords: ${item.keywords.join(", ")}`;
          const vec = await getEmbedding(textToEmbed);
          if (vec) {
            item.embedding = vec;
          }
        } catch {
          // If individual embedding fails, continue
        }
      })
    );
    isIndexed = true;
  } catch (err) {
    console.warn("[rag] Warning during knowledge indexing:", err);
  } finally {
    isIndexingInProgress = false;
  }
}

/**
 * Calculate keyword relevance score between a query and an item.
 */
function calculateKeywordScore(query: string, item: DesignKnowledgeItem): number {
  const queryLower = query.toLowerCase();
  const queryTokens = queryLower.split(/\W+/).filter((t) => t.length > 2);
  if (queryTokens.length === 0) return 0;

  let matches = 0;
  for (const token of queryTokens) {
    if (
      item.keywords.some((kw) => kw.toLowerCase().includes(token)) ||
      item.title.toLowerCase().includes(token)
    ) {
      matches += 1;
    }
  }

  return matches / queryTokens.length;
}

/**
 * Retrieve the top K most relevant design knowledge items for a user instruction.
 */
export async function retrieveDesignKnowledge(
  query: string,
  topK = 2
): Promise<RetrievalResult[]> {
  // Ensure indexing has run or is running
  if (!isIndexed && !isIndexingInProgress) {
    void initializeKnowledgeIndex();
  }

  const queryEmbedding = await getEmbedding(query);
  const scoredItems: RetrievalResult[] = [];

  for (const item of DESIGN_KNOWLEDGE_BASE) {
    const keywordScore = calculateKeywordScore(query, item);

    let vectorScore = 0;
    if (queryEmbedding && item.embedding) {
      vectorScore = Math.max(0, cosineSimilarity(queryEmbedding, item.embedding));
    }

    // Hybrid score: 65% vector similarity + 35% keyword boost
    // If no vector embedding is available, falls back gracefully to keywordScore
    const finalScore = queryEmbedding && item.embedding
      ? vectorScore * 0.65 + keywordScore * 0.35
      : keywordScore;

    if (finalScore > 0.15) {
      scoredItems.push({ item, score: finalScore });
    }
  }

  scoredItems.sort((a, b) => b.score - a.score);
  return scoredItems.slice(0, topK);
}

/**
 * Format retrieved knowledge items into a compact markdown block
 * for the LLM planning prompt.
 */
export function formatRetrievedKnowledgeForPrompt(results: RetrievalResult[]): string {
  if (results.length === 0) return "";

  const sections = results.map((r, i) => {
    return `### Reference ${i + 1}: ${r.item.title} (Relevance: ${(r.score * 100).toFixed(0)}%)\n${r.item.content}`;
  });

  return `\n## Retrieved Design Knowledge (Style & Layout Guidelines)\nUse the following curated aesthetic and structural guidance to inform your plan:\n\n${sections.join("\n\n")}\n`;
}
