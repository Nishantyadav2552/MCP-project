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
  start: z.number().int().nonnegative(),
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

const ResizeElementOpSchema = z.object({
  type: z.literal("resize_element"),
  elementId: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive().optional(),
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

const OperationSchema = z.discriminatedUnion("type", [
  UpdateTextStyleOpSchema,
  UpdateFillColorOpSchema,
  UpdateBackgroundColorOpSchema,
  MoveElementOpSchema,
  ResizeElementOpSchema,
  ChangeLayerOrderOpSchema,
  DeleteElementOpSchema,
  UpdateTextContentOpSchema,
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
  sessionId: string
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

  // Validate schema
  const validation = LLMResponseSchema.safeParse(parsed);
  if (!validation.success) {
    console.error("[planner] Schema validation failed:", validation.error.issues);
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
  };

  return { type: "plan", plan, explanation: response.explanation };
}
