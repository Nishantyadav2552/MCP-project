/**
 * Backend-only type re-exports and extensions.
 * Shared frontend/backend types come from src/shared/types.ts.
 * Keep this file focused on backend-specific structures.
 */

export * from "../../src/shared/types";

// ─── Graph types ──────────────────────────────────────────────────────────────

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
  basis: string; // e.g. "largest font size on page", "positioned in top-left corner"
}

export interface GraphNode {
  elementId: string;
  snapshot: import("../../src/shared/types").ElementSnapshot;
  semantics: SemanticAnnotation;
  /** Inferred relationships to other nodes */
  relationships: GraphEdge[];
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
  /** Additional data: e.g. alignment axis, distance in px */
  metadata?: Record<string, unknown>;
}

export interface DesignGraph {
  pageId: string;
  nodes: Map<string, GraphNode>;
  builtAt: number;
}

// ─── Agent session ────────────────────────────────────────────────────────────

export interface AgentSession {
  sessionId: string;
  graph: DesignGraph | null;
  lastSnapshotAt: number;
  conversationHistory: ConversationTurn[];
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  planId?: string;
  timestamp: number;
}
