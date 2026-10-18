import { z } from "zod";

/**
 * Supported Canva Element Types
 */
export type ElementType = "text" | "shape" | "rect" | "group" | "embed" | "unsupported";

/**
 * Inferred Semantic Roles for design elements
 */
export type SemanticRole =
  | "heading_main"
  | "heading_sub"
  | "title"
  | "body"
  | "caption"
  | "logo"
  | "cta"
  | "card"
  | "image"
  | "background"
  | "divider"
  | "unknown";

/**
 * Text formatting properties
 */
export interface TextFormatting {
  color?: string; // Hex string e.g. #0000FF
  fontSize?: number; // In points (1 to 1000)
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "start" | "center" | "end" | "justify";
  decoration?: "none" | "underline";
}

/**
 * Bounding Box / Geometric position
 */
export interface ElementGeometry {
  top: number;
  left: number;
  width: number;
  height: number;
  rotation: number;
  transparency: number;
}

/**
 * Element Snapshot representing the state of an element in a design
 */
export interface ElementSnapshot {
  id: string; // Stable adapter-assigned handle ID
  type: ElementType;
  geometry: ElementGeometry;
  locked: boolean;
  zIndex: number;
  // Specific to text
  text?: string;
  formatting?: TextFormatting;
  // Specific to shapes / rects
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  // Inferred metadata
  semanticRole?: SemanticRole;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Page Snapshot
 */
export interface PageSnapshot {
  id: string;
  type: "absolute" | "flow" | "unsupported";
  dimensions: {
    width: number;
    height: number;
  };
  backgroundColor?: string;
  locked: boolean;
  elements: ElementSnapshot[];
}

/**
 * Design Snapshot
 */
export interface DesignSnapshot {
  designId: string;
  page: PageSnapshot;
  version: string;
  timestamp: number;
}

/**
 * Operation Schemas validated with Zod
 */
export const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid 6-character hex code prefixed with #");

export const UpdateTextColorOpSchema = z.object({
  type: z.literal("update_text_color"),
  targetElementId: z.string().min(1),
  color: HexColorSchema,
});

export const UpdateFontSizeOpSchema = z.object({
  type: z.literal("update_font_size"),
  targetElementId: z.string().min(1),
  fontSize: z.number().min(1).max(1000),
});

export const UpdateTextContentOpSchema = z.object({
  type: z.literal("update_text_content"),
  targetElementId: z.string().min(1),
  text: z.string(),
});

export const UpdateTextStyleOpSchema = z.object({
  type: z.literal("update_text_style"),
  targetElementId: z.string().min(1),
  color: HexColorSchema.optional(),
  fontSize: z.number().min(1).max(1000).optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  textAlign: z.enum(["start", "center", "end", "justify"]).optional(),
});

export const MoveElementOpSchema = z.object({
  type: z.literal("move_element"),
  targetElementId: z.string().min(1),
  position: z.object({
    top: z.number().min(-32768).max(32767).optional(),
    left: z.number().min(-32768).max(32767).optional(),
  }).refine((pos) => pos.top !== undefined || pos.left !== undefined, {
    message: "At least one of 'top' or 'left' must be specified",
  }),
});

export const UpdateFillColorOpSchema = z.object({
  type: z.literal("update_fill_color"),
  targetElementId: z.string().min(1),
  fillColor: HexColorSchema,
});

export const UpdateBackgroundColorOpSchema = z.object({
  type: z.literal("update_background_color"),
  color: HexColorSchema,
});

export const DeleteElementOpSchema = z.object({
  type: z.literal("delete_element"),
  targetElementId: z.string().min(1),
  requireConfirmation: z.boolean().default(true),
});

export const DesignOperationSchema = z.discriminatedUnion("type", [
  UpdateTextColorOpSchema,
  UpdateFontSizeOpSchema,
  UpdateTextContentOpSchema,
  UpdateTextStyleOpSchema,
  MoveElementOpSchema,
  UpdateFillColorOpSchema,
  UpdateBackgroundColorOpSchema,
  DeleteElementOpSchema,
]);

export type DesignOperation = z.infer<typeof DesignOperationSchema>;

/**
 * Operation Execution Result
 */
export interface OperationResult {
  operationId: string;
  operation: DesignOperation;
  success: boolean;
  timestamp: number;
  targetElementId?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  verified: boolean;
  error?: string;
}

/**
 * Execution Plan
 */
export interface ExecutionPlan {
  planId: string;
  userInstruction: string;
  rationale: string;
  targetElementIds: string[];
  operations: DesignOperation[];
  estimatedImpact: "low" | "medium" | "high";
  requiresConfirmation: boolean;
}
