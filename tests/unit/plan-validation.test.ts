/**
 * Unit tests for plan validation logic.
 * Tests that the Zod schemas correctly accept/reject operations.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import type { DesignOperation } from "../../src/shared/types";

// Re-implement the key validation schema here (mirrors planner.ts) for isolated testing
const TextFormattingSchema = z.object({
  color: z.string().regex(/^#[0-9a-f]{6}$/).optional(),
  fontSize: z.number().positive().optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  textAlign: z.enum(["start", "center", "end", "justify"]).optional(),
  decoration: z.enum(["none", "underline", "line-through"]).optional(),
});

const UpdateTextStyleOpSchema = z.object({
  type: z.literal("update_text_style"),
  elementId: z.string().min(1),
  formatting: TextFormattingSchema,
});

const MoveElementOpSchema = z.object({
  type: z.literal("move_element"),
  elementId: z.string().min(1),
  top: z.number(),
  left: z.number(),
});

describe("UpdateTextStyle validation", () => {
  it("accepts a valid text style operation", () => {
    const op = {
      type: "update_text_style",
      elementId: "el-abc",
      formatting: { color: "#ff0099", fontSize: 36, fontWeight: "bold" },
    };
    expect(UpdateTextStyleOpSchema.safeParse(op).success).toBe(true);
  });

  it("rejects uppercase hex color", () => {
    const op = {
      type: "update_text_style",
      elementId: "el-abc",
      formatting: { color: "#FF0099" },
    };
    expect(UpdateTextStyleOpSchema.safeParse(op).success).toBe(false);
  });

  it("rejects negative font size", () => {
    const op = {
      type: "update_text_style",
      elementId: "el-abc",
      formatting: { fontSize: -12 },
    };
    expect(UpdateTextStyleOpSchema.safeParse(op).success).toBe(false);
  });

  it("rejects empty elementId", () => {
    const op = {
      type: "update_text_style",
      elementId: "",
      formatting: { fontSize: 24 },
    };
    expect(UpdateTextStyleOpSchema.safeParse(op).success).toBe(false);
  });

  it("accepts operation with no formatting fields (no-op)", () => {
    const op = {
      type: "update_text_style",
      elementId: "el-abc",
      formatting: {},
    };
    expect(UpdateTextStyleOpSchema.safeParse(op).success).toBe(true);
  });
});

describe("MoveElement validation", () => {
  it("accepts valid move operation", () => {
    const op = { type: "move_element", elementId: "el-abc", top: 100, left: 200 };
    expect(MoveElementOpSchema.safeParse(op).success).toBe(true);
  });

  it("accepts top=0 and left=0", () => {
    const op = { type: "move_element", elementId: "el-abc", top: 0, left: 0 };
    expect(MoveElementOpSchema.safeParse(op).success).toBe(true);
  });

  it("rejects missing top", () => {
    const op = { type: "move_element", elementId: "el-abc", left: 200 };
    expect(MoveElementOpSchema.safeParse(op).success).toBe(false);
  });
});
