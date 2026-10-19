/**
 * agent/planner.ts
 *
 * LLM-driven plan generator.
 * Converts a user instruction + design graph into a validated OperationPlan.
 *
 * LLM providers are abstracted behind a simple interface so the provider can
 * be swapped without touching orchestration logic.
 */

import { z } from "zod";
import type { OperationPlan, DesignOperation } from "../../src/shared/types";
import type { DesignGraph } from "../graph/models";
import { summarizeGraphForPrompt } from "../graph/queries";
import { SYSTEM_PROMPT, buildPlanningPrompt } from "./prompts";
import { createLLMProvider, type LLMProvider } from "./llm-provider";

// ─── Zod schemas for LLM output validation ───────────────────────────────────

const TextFormattingSchema = z.object({
  color: z.string().regex(/^#[0-9a-f]{6}$/).optional(),
  fontSize: z.number().positive().optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  textAlign: z.enum(["start", "center", "end", "justify"]).optional(),
  decoration: z.enum(["none", "underline", "line-through"]).optional(),
});

const RangeSchema = z.object({
  index: z.number().int().nonnegative(),
  length: z.number().int().positive(),
});

const UpdateTextStyleOpSchema = z.object({
  type: z.literal("update_text_style"),
  elementId: z.string().min(1),
  formatting: TextFormattingSchema,
  range: RangeSchema.optional(),
});

const UpdateFillColorOpSchema = z.object({
  type: z.literal("update_fill_color"),
  elementId: z.string().min(1),
  color: z.string().regex(/^#[0-9a-f]{6}$/),
});

const UpdateBackgroundColorOpSchema = z.object({
  type: z.literal("update_background_color"),
  color: z.string().regex(/^#[0-9a-f]{6}$/),
});

const MoveElementOpSchema = z.object({
  type: z.literal("move_element"),
  elementId: z.string().min(1),
  top: z.number(),
  left: z.number(),
});

const ChangeLayerOrderOpSchema = z.object({
  type: z.literal("change_layer_order"),
  elementId: z.string().min(1),
  relativeElementId: z.string().min(1).nullable(),
  direction: z.enum(["before", "after"]),
});

const DeleteElementOpSchema = z.object({
  type: z.literal("delete_element"),
  elementId: z.string().min(1),
});

const UpdateTextContentOpSchema = z.object({
  type: z.literal("update_text_content"),
  elementId: z.string().min(1),
  newText: z.string(),
  preserveFormatting: z.boolean(),
});

const GroupElementsOpSchema = z.object({
  type: z.literal("group_elements"),
  elementIds: z.array(z.string().min(1)).min(2),
});

const UngroupElementOpSchema = z.object({
  type: z.literal("ungroup_element"),
  elementId: z.string().min(1),
});

const DuplicateElementOpSchema = z.object({
  type: z.literal("duplicate_element"),
  elementId: z.string().min(1),
  offsetTop: z.number().optional(),
  offsetLeft: z.number().optional(),
});

const AddShapeOpSchema = z.object({
  type: z.literal("add_shape"),
  shape: z.enum(["rectangle", "circle", "triangle", "star"]),
  top: z.number(),
  left: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string().regex(/^#[0-9a-f]{6}$/),
  strokeColor: z.string().regex(/^#[0-9a-f]{6}$/).optional(),
  strokeWeight: z.number().nonnegative().optional(),
});

const AddLineOpSchema = z.object({
  type: z.literal("add_line"),
  top: z.number(),
  left: z.number(),
  width: z.number().positive(),
  height: z.number().positive().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/),
  rotation: z.number().optional(),
});

const AddTextOpSchema = z.object({
  type: z.literal("add_text"),
  text: z.string().min(1),
  top: z.number(),
  left: z.number(),
  width: z.number().positive().optional(),
  fontSize: z.number().positive().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/).optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  textAlign: z.enum(["start", "center", "end", "justify"]).optional(),
});

export const OperationSchema = z.discriminatedUnion("type", [
  UpdateTextStyleOpSchema,
  UpdateFillColorOpSchema,
  UpdateBackgroundColorOpSchema,
  MoveElementOpSchema,
  ChangeLayerOrderOpSchema,
  DeleteElementOpSchema,
  UpdateTextContentOpSchema,
  GroupElementsOpSchema,
  UngroupElementOpSchema,
  DuplicateElementOpSchema,
  AddShapeOpSchema,
  AddLineOpSchema,
  AddTextOpSchema,
]);

const PlanResponseSchema = z.object({
  type: z.literal("plan"),
  planId: z.string(),
  description: z.string(),
  operations: z.array(OperationSchema).min(1),
  explanation: z.string(),
});

const ClarificationResponseSchema = z.object({
  type: z.literal("clarification"),
  question: z.string(),
});

const ImpossibleResponseSchema = z.object({
  type: z.literal("impossible"),
  explanation: z.string(),
});

const LLMResponseSchema = z.discriminatedUnion("type", [
  PlanResponseSchema,
  ClarificationResponseSchema,
  ImpossibleResponseSchema,
]);

type LLMResponse = z.infer<typeof LLMResponseSchema>;

// ─── Element ID validation ────────────────────────────────────────────────────

/**
 * Validate that all element IDs in the plan exist in the design graph.
 * Returns a list of invalid IDs.
 */
function validateElementIds(
  operations: DesignOperation[],
  graph: DesignGraph
): string[] {
  const invalid: string[] = [];
  for (const op of operations) {
    if ("elementId" in op && op.elementId) {
      if (!graph.nodes.has(op.elementId)) {
        invalid.push(op.elementId);
      }
    }
    if ("elementIds" in op && Array.isArray(op.elementIds)) {
      for (const id of op.elementIds) {
        if (!graph.nodes.has(id)) {
          invalid.push(id);
        }
      }
    }
    if (op.type === "change_layer_order" && op.relativeElementId) {
      if (!graph.nodes.has(op.relativeElementId)) {
        invalid.push(op.relativeElementId);
      }
    }
  }
  return [...new Set(invalid)];
}

// ─── Planner ──────────────────────────────────────────────────────────────────

export interface PlannerResult {
  type: "plan" | "clarification" | "impossible" | "error";
  plan?: OperationPlan;
  clarificationQuestion?: string;
  explanation?: string;
  error?: string;
}

let llmProvider: LLMProvider | null = null;

function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    llmProvider = createLLMProvider();
  }
  return llmProvider;
}

/**
 * Generate an operation plan from a user instruction and the current design graph.
 */
export async function generatePlan(
  instruction: string,
  graph: DesignGraph,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  _sessionId: string
): Promise<PlannerResult> {
  const designSummary = summarizeGraphForPrompt(graph);
  const userPrompt = buildPlanningPrompt(designSummary, instruction, conversationHistory);

  let rawResponse: string;
  try {
    const provider = getLLMProvider();
    rawResponse = await provider.complete(SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { type: "error", error: `LLM request failed: ${msg}` };
  }

  // Parse JSON
  let parsed: unknown;
  try {
    // Strip markdown code fences if the model wrapped the JSON
    const jsonStr = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error("[planner] LLM returned non-JSON:", rawResponse.slice(0, 500));
    return { type: "error", error: "LLM returned an invalid response (not JSON). Please try again." };
  }

  // Normalize operations if LLM omitted "type"
  if (
    parsed &&
    typeof parsed === "object" &&
    "operations" in parsed &&
    Array.isArray((parsed as Record<string, unknown>).operations)
  ) {
    const rawOps = (parsed as Record<string, unknown>).operations as Array<Record<string, unknown>>;
    for (const op of rawOps) {
      if (typeof op === "object" && op !== null && !op.type) {
        if ("formatting" in op) {
          op.type = "update_text_style";
        } else if ("newText" in op) {
          op.type = "update_text_content";
        } else if ("color" in op) {
          op.type = "elementId" in op ? "update_fill_color" : "update_background_color";
        } else if ("top" in op || "left" in op) {
          op.type = "move_element";
        } else if ("relativeElementId" in op) {
          op.type = "change_layer_order";
        } else if ("elementIds" in op) {
          op.type = "group_elements";
        } else if ("offsetTop" in op || "offsetLeft" in op) {
          op.type = "duplicate_element";
        } else if ("shape" in op) {
          op.type = "add_shape";
        } else if ("text" in op && !("elementId" in op)) {
          op.type = "add_text";
        }
      }
    }
  }

  // Validate schema
  const validation = LLMResponseSchema.safeParse(parsed);
  if (!validation.success) {
    console.error("[planner] Schema validation failed:", validation.error.issues);
    console.error("[planner] Parsed LLM object was:", JSON.stringify(parsed, null, 2));
    return { type: "error", error: "LLM response did not match expected schema. Please try again." };
  }

  const response: LLMResponse = validation.data;

  if (response.type === "clarification") {
    return { type: "clarification", clarificationQuestion: response.question };
  }

  if (response.type === "impossible") {
    return { type: "impossible", explanation: response.explanation };
  }

  // It's a plan — validate element IDs against the live graph
  const operations = response.operations as DesignOperation[];
  const invalidIds = validateElementIds(operations, graph);

  if (invalidIds.length > 0) {
    console.error("[planner] LLM used invalid element IDs:", invalidIds);
    return {
      type: "error",
      error: `The plan referenced element IDs that don't exist in the design: ${invalidIds.join(", ")}. Please try again.`,
    };
  }

  const plan: OperationPlan = {
    planId: response.planId,
    operations,
    description: response.description,
    snapshotElementCount: graph.sourceSnapshot.elements.length,
  };

  return { type: "plan", plan, explanation: response.explanation };
}
