/**
 * rag/types.ts
 *
 * Types for the Design Knowledge Base and RAG retriever.
 */

export type KnowledgeCategory =
  | "style_archetype"
  | "component_blueprint"
  | "layout_pattern"
  | "color_palette";

export interface DesignKnowledgeItem {
  id: string;
  title: string;
  category: KnowledgeCategory;
  keywords: string[];
  summary: string;
  /**
   * Concrete guidance, color hex codes, typography sizes, and coordinate/nesting rules
   * for the LLM to ground its operation plan.
   */
  content: string;
  embedding?: number[];
}

export interface RetrievalResult {
  item: DesignKnowledgeItem;
  score: number;
}
