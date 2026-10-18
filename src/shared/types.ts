/**
 * Shared type definitions used by both the Canva app frontend and the backend agent.
 *
 * These types define the serialized representation of Canva design state and the
 * operation plan protocol exchanged over HTTP. They deliberately contain only
 * plain JSON-serializable data — no Canva SDK objects.
 */

// ─── Design Snapshot ─────────────────────────────────────────────────────────

/**
 * A serialized, JSON-safe representation of an element's text formatting.
 * Corresponds to the formatting object in openDesign text regions.
 */
export interface TextFormatting {
  fontSize?: number;
  color?: string; // hex, lowercase, e.g. "#ff0099"
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "start" | "center" | "end" | "justify";
  decoration?: "none" | "underline" | "line-through";
}

/**
 * A single richtext region: a run of text with uniform formatting.
 */
export interface TextRegion {
  text: string;
  formatting: TextFormatting;
}

/**
 * Serialized representation of a fill (background or rect fill).
 */
export type SerializedFill =
  | { type: "solid"; color: string }
  | { type: "image"; imageRef: string }
  | { type: "video"; videoRef: string }
  | { type: "none" };

/**
 * Properties common to all element types.
 */
export interface BaseElementSnapshot {
  id: string; // stable element identifier within the design session
  type: string;
  top: number;
  left: number;
  width: number;
  height: number;
  rotation: number;
  transparency: number;
  locked: boolean;
}

export interface TextElementSnapshot extends BaseElementSnapshot {
  type: "text";
  plaintext: string;
  regions: TextRegion[];
}

export interface RectElementSnapshot extends BaseElementSnapshot {
  type: "rect";
  fill: SerializedFill;
}

export interface ShapeElementSnapshot extends BaseElementSnapshot {
  type: "shape";
  // paths have their own fills; we serialize the first path's fill for quick inspection
  primaryFill: SerializedFill;
}

export interface GroupElementSnapshot extends BaseElementSnapshot {
  type: "group";
  childIds: string[]; // IDs of direct children (resolved in elements map)
}

export interface EmbedElementSnapshot extends BaseElementSnapshot {
  type: "embed";
  url: string;
}

export interface UnsupportedElementSnapshot extends BaseElementSnapshot {
  type: "unsupported";
}

export type ElementSnapshot =
  | TextElementSnapshot
  | RectElementSnapshot
  | ShapeElementSnapshot
  | GroupElementSnapshot
  | EmbedElementSnapshot
  | UnsupportedElementSnapshot;

/**
 * Serialized page background.
 */
export interface PageBackground {
  fill: SerializedFill;
}

/**
 * A full serialized snapshot of one page's elements and metadata.
 * This is what the frontend sends to the backend with every request.
 */
export interface DesignSnapshot {
  pageId: string;
  pageType: "absolute" | "unsupported";
  pageLocked: boolean;
  dimensions: { width: number; height: number } | null; // null = unbounded
  background: PageBackground | null;
  elements: ElementSnapshot[];
  /** Timestamp when the snapshot was taken (ms since epoch) */
  capturedAt: number;
}

// ─── Operation Plan ───────────────────────────────────────────────────────────

/**
 * Typed operations that the frontend can execute against the Canva SDK.
 * Each operation maps directly to SDK mutations that can be applied inside
 * an openDesign callback.
 */

export interface UpdateTextStyleOp {
  type: "update_text_style";
  elementId: string;
  /** Formatting to apply to the entire text content */
  formatting: TextFormatting;
  /** Optionally restrict to a character range */
  range?: { start: number; length: number };
}

export interface UpdateFillColorOp {
  type: "update_fill_color";
  elementId: string;
  color: string; // hex lowercase
}

export interface UpdateBackgroundColorOp {
  type: "update_background_color";
  color: string;
}

export interface MoveElementOp {
  type: "move_element";
  elementId: string;
  top: number;
  left: number;
}

export interface ResizeElementOp {
  type: "resize_element";
  elementId: string;
  width: number;
  height?: number; // omit for text elements (auto-sized)
}

export interface ChangeLayerOrderOp {
  type: "change_layer_order";
  elementId: string;
  relativeElementId: string | null; // null = move to top
  direction: "before" | "after";
}

export interface DeleteElementOp {
  type: "delete_element";
  elementId: string;
}

export interface UpdateTextContentOp {
  type: "update_text_content";
  elementId: string;
  newText: string;
  /** Preserve existing formatting when replacing text */
  preserveFormatting: boolean;
}

export type DesignOperation =
  | UpdateTextStyleOp
  | UpdateFillColorOp
  | UpdateBackgroundColorOp
  | MoveElementOp
  | ResizeElementOp
  | ChangeLayerOrderOp
  | DeleteElementOp
  | UpdateTextContentOp;

/**
 * A validated, ordered plan produced by the backend agent.
 * The frontend executes these operations in order inside a single openDesign callback.
 */
export interface OperationPlan {
  planId: string;
  operations: DesignOperation[];
  /** Human-readable description of what this plan will do */
  description: string;
  /** Operations that must succeed before later ones can run */
  dependencies?: Array<{ operationIndex: number; dependsOnIndex: number }>;
}

// ─── Agent Request / Response ────────────────────────────────────────────────

export interface AgentRequest {
  sessionId: string;
  instruction: string;
  snapshot: DesignSnapshot;
  /** Previous turn's plan ID (for context) */
  priorPlanId?: string;
}

export interface AgentResponse {
  sessionId: string;
  plan: OperationPlan | null;
  explanation: string;
  clarificationNeeded?: string;
  /** If true, the agent detected an ambiguity and needs the user to answer */
  requiresClarification: boolean;
}

// ─── Execution Results ────────────────────────────────────────────────────────

export type OperationStatus =
  | "succeeded"
  | "succeeded_unverified"
  | "failed"
  | "skipped";

export interface OperationResult {
  operationIndex: number;
  operationType: DesignOperation["type"];
  status: OperationStatus;
  errorMessage?: string;
  /** Element properties re-read after the operation for verification */
  verifiedProperties?: Record<string, unknown>;
}

export interface ExecutionResult {
  sessionId: string;
  planId: string;
  operationResults: OperationResult[];
  updatedSnapshot: DesignSnapshot;
  executedAt: number;
}
