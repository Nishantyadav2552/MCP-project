/**
 * graph/models.ts
 *
 * Type definitions for the Design Knowledge Graph.
 * Separated from graph construction and querying logic.
 */

import type {
  ElementSnapshot,
  TextElementSnapshot,
  DesignSnapshot,
} from "../../src/shared/types";

export type SemanticRole =
  | "main_heading"
  | "subheading"
  | "subtitle"
  | "body_text"
  | "caption"
  | "call_to_action"
  | "logo"
  | "background_image"
  | "decorative"
  | "unknown";

export interface SemanticAnnotation {
  role: SemanticRole;
  confidence: number; // 0–1
  basis: string;
}

export type RelationshipType =
  | "CONTAINS"
  | "ALIGNED_WITH"
  | "NEAR"
  | "OVERLAPS"
  | "ABOVE"
  | "BELOW"
  | "LEFT_OF"
  | "RIGHT_OF"
  | "SAME_STYLE_AS"
  | "SEMANTICALLY_RELATED_TO";

export interface GraphEdge {
  type: RelationshipType;
  targetElementId: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface GraphNode {
  elementId: string;
  snapshot: ElementSnapshot;
  semantics: SemanticAnnotation;
  relationships: GraphEdge[];
}

export interface DesignGraph {
  pageId: string;
  pageDimensions: { width: number; height: number } | null;
  nodes: Map<string, GraphNode>;
  builtAt: number;
  sourceSnapshot: DesignSnapshot;
}

/**
 * Query result returned by graph query functions.
 */
export interface QueryResult {
  elementId: string;
  snapshot: ElementSnapshot;
  semantics: SemanticAnnotation;
  score: number; // relevance score for ranking
}

/**
 * Context provided to the agent planner alongside a user instruction.
 */
export interface PlanningContext {
  graph: DesignGraph;
  instruction: string;
  sessionId: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}
