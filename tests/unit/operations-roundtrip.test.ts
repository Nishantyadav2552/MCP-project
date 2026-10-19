/**
 * Unit tests for operation schema validation roundtrip.
 * Ensures each operation in DesignOperation is accepted when valid and rejected when invalid.
 */

import { describe, it, expect } from "vitest";
import { OperationSchema } from "../../backend/agent/planner";

describe("OperationSchema roundtrip validation", () => {
  describe("update_text_style", () => {
    it("accepts valid operation with index/length range", () => {
      const op = {
        type: "update_text_style",
        elementId: "el-0",
        formatting: { color: "#112233", fontSize: 24, fontWeight: "bold" },
        range: { index: 0, length: 5 },
      };
      expect(OperationSchema.safeParse(op).success).toBe(true);
    });

    it("rejects operation with missing formatting or empty elementId", () => {
      expect(OperationSchema.safeParse({ type: "update_text_style", elementId: "" }).success).toBe(false);
      expect(OperationSchema.safeParse({ type: "update_text_style", elementId: "el-0" }).success).toBe(false);
    });
  });

  describe("update_fill_color", () => {
    it("accepts valid solid color fill", () => {
      const op = { type: "update_fill_color", elementId: "el-1", color: "#ff0099" };
      expect(OperationSchema.safeParse(op).success).toBe(true);
    });

    it("rejects uppercase or invalid hex color", () => {
      expect(OperationSchema.safeParse({ type: "update_fill_color", elementId: "el-1", color: "#FF0099" }).success).toBe(false);
      expect(OperationSchema.safeParse({ type: "update_fill_color", elementId: "el-1", color: "blue" }).success).toBe(false);
    });
  });

  describe("update_background_color", () => {
    it("accepts valid background color", () => {
      const op = { type: "update_background_color", color: "#ffffff" };
      expect(OperationSchema.safeParse(op).success).toBe(true);
    });

    it("rejects missing color", () => {
      expect(OperationSchema.safeParse({ type: "update_background_color" }).success).toBe(false);
    });
  });

  describe("move_element", () => {
    it("accepts valid coordinates", () => {
      const op = { type: "move_element", elementId: "el-2", top: 100, left: 200 };
      expect(OperationSchema.safeParse(op).success).toBe(true);
    });

    it("rejects non-numeric coordinates", () => {
      expect(OperationSchema.safeParse({ type: "move_element", elementId: "el-2", top: "100", left: 200 }).success).toBe(false);
    });
  });

  describe("change_layer_order", () => {
    it("accepts valid layer change with relative anchor", () => {
      const op = {
        type: "change_layer_order",
        elementId: "el-2",
        relativeElementId: "el-1",
        direction: "before",
      };
      expect(OperationSchema.safeParse(op).success).toBe(true);
    });

    it("accepts null relativeElementId (move to top)", () => {
      const op = {
        type: "change_layer_order",
        elementId: "el-2",
        relativeElementId: null,
        direction: "after",
      };
      expect(OperationSchema.safeParse(op).success).toBe(true);
    });

    it("rejects invalid direction", () => {
      const op = {
        type: "change_layer_order",
        elementId: "el-2",
        relativeElementId: "el-1",
        direction: "top",
      };
      expect(OperationSchema.safeParse(op).success).toBe(false);
    });
  });

  describe("delete_element", () => {
    it("accepts valid delete operation", () => {
      const op = { type: "delete_element", elementId: "el-3" };
      expect(OperationSchema.safeParse(op).success).toBe(true);
    });

    it("rejects empty elementId", () => {
      expect(OperationSchema.safeParse({ type: "delete_element", elementId: "" }).success).toBe(false);
    });
  });

  describe("update_text_content", () => {
    it("accepts valid text update with preserveFormatting", () => {
      const op = {
        type: "update_text_content",
        elementId: "el-4",
        newText: "Hello Canva",
        preserveFormatting: true,
      };
      expect(OperationSchema.safeParse(op).success).toBe(true);
    });

    it("rejects missing newText or preserveFormatting", () => {
      expect(OperationSchema.safeParse({ type: "update_text_content", elementId: "el-4" }).success).toBe(false);
      expect(OperationSchema.safeParse({ type: "update_text_content", elementId: "el-4", newText: "Hi" }).success).toBe(false);
    });
  });

  describe("group_elements", () => {
    it("accepts valid group with 2 or more element IDs", () => {
      const op = { type: "group_elements", elementIds: ["el-1", "el-2"] };
      expect(OperationSchema.safeParse(op).success).toBe(true);
    });

    it("rejects group with fewer than 2 elements", () => {
      expect(OperationSchema.safeParse({ type: "group_elements", elementIds: ["el-1"] }).success).toBe(false);
      expect(OperationSchema.safeParse({ type: "group_elements", elementIds: [] }).success).toBe(false);
    });
  });

  describe("ungroup_element", () => {
    it("accepts valid ungroup operation", () => {
      const op = { type: "ungroup_element", elementId: "el-5" };
      expect(OperationSchema.safeParse(op).success).toBe(true);
    });

    it("rejects empty elementId", () => {
      expect(OperationSchema.safeParse({ type: "ungroup_element", elementId: "" }).success).toBe(false);
    });
  });

  describe("duplicate_element", () => {
    it("accepts valid duplicate with optional offsets", () => {
      expect(OperationSchema.safeParse({ type: "duplicate_element", elementId: "el-6" }).success).toBe(true);
      expect(OperationSchema.safeParse({ type: "duplicate_element", elementId: "el-6", offsetTop: 30, offsetLeft: 40 }).success).toBe(true);
    });

    it("rejects empty elementId or wrong type", () => {
      expect(OperationSchema.safeParse({ type: "duplicate_element", elementId: "" }).success).toBe(false);
      expect(OperationSchema.safeParse({ type: "duplicate_element", elementId: "el-6", offsetTop: "30" }).success).toBe(false);
    });
  });

  describe("removed resize_element", () => {
    it("rejects resize_element as an unsupported operation", () => {
      const op = { type: "resize_element", elementId: "el-7", width: 100 };
      expect(OperationSchema.safeParse(op).success).toBe(false);
    });
  });
});
