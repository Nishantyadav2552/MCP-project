import {
  DesignSnapshot,
  DesignOperation,
  OperationResult,
  ElementSnapshot,
  PageSnapshot,
  ElementType,
} from "@canva-cursor/shared";
import { ICanvaAdapter, VerificationResult } from "./interfaces.js";
import { ElementHandleRegistry } from "./handle-registry.js";

/**
 * In-memory simulation of a Canva Design element following the official @canva/design SDK model.
 */
export interface SimulatedElement {
  type: ElementType;
  top: number;
  left: number;
  width: number;
  height: number;
  rotation: number;
  transparency: number;
  locked: boolean;
  // Text specifics
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "start" | "center" | "end" | "justify";
  // Shape/Rect specifics
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

/**
 * High-fidelity Simulation Adapter adhering directly to Canva's Design Editing API contracts.
 */
export class SimulationCanvaAdapter implements ICanvaAdapter {
  public readonly adapterType = "simulation";
  private registry = new ElementHandleRegistry();

  private designId: string;
  private page: {
    id: string;
    type: "absolute";
    dimensions: { width: number; height: number };
    backgroundColor: string;
    locked: boolean;
    elements: SimulatedElement[];
  };

  private version = 1;

  constructor(initialData?: {
    designId?: string;
    dimensions?: { width: number; height: number };
    backgroundColor?: string;
    elements?: SimulatedElement[];
  }) {
    this.designId = initialData?.designId || "design_demo_01";
    this.page = {
      id: "page_main_01",
      type: "absolute",
      dimensions: initialData?.dimensions || { width: 1920, height: 1080 },
      backgroundColor: initialData?.backgroundColor || "#FFFFFF",
      locked: false,
      elements: initialData?.elements || [
        {
          type: "text",
          top: 120,
          left: 160,
          width: 800,
          height: 90,
          rotation: 0,
          transparency: 1,
          locked: false,
          text: "Welcome to Our Platform",
          color: "#111827",
          fontSize: 48,
          fontFamily: "Inter",
          fontWeight: "bold",
          textAlign: "start",
        },
        {
          type: "text",
          top: 230,
          left: 160,
          width: 650,
          height: 50,
          rotation: 0,
          transparency: 1,
          locked: false,
          text: "Build something great with AI and Cursor precision",
          color: "#4B5563",
          fontSize: 22,
          fontFamily: "Inter",
          fontWeight: "normal",
          textAlign: "start",
        },
        {
          type: "rect",
          top: 340,
          left: 160,
          width: 200,
          height: 60,
          rotation: 0,
          transparency: 1,
          locked: false,
          fillColor: "#2563EB",
        },
      ],
    };
  }

  public async getSnapshot(): Promise<DesignSnapshot> {
    const elementSnapshots: ElementSnapshot[] = this.page.elements.map((el, index) => {
      const handleId = this.registry.getOrCreateHandleId(el, {
        pageId: this.page.id,
        zIndex: index,
        type: el.type,
        top: el.top,
        left: el.left,
        textSnippet: el.text,
      });

      const snapshot: ElementSnapshot = {
        id: handleId,
        type: el.type,
        geometry: {
          top: el.top,
          left: el.left,
          width: el.width,
          height: el.height,
          rotation: el.rotation,
          transparency: el.transparency,
        },
        locked: el.locked,
        zIndex: index,
        text: el.text,
        formatting:
          el.type === "text"
            ? {
                color: el.color,
                fontSize: el.fontSize,
                fontFamily: el.fontFamily,
                fontWeight: el.fontWeight,
                fontStyle: el.fontStyle,
                textAlign: el.textAlign,
              }
            : undefined,
        fillColor: el.fillColor,
        strokeColor: el.strokeColor,
        strokeWidth: el.strokeWidth,
      };

      return snapshot;
    });

    const pageSnapshot: PageSnapshot = {
      id: this.page.id,
      type: this.page.type,
      dimensions: { ...this.page.dimensions },
      backgroundColor: this.page.backgroundColor,
      locked: this.page.locked,
      elements: elementSnapshots,
    };

    return {
      designId: this.designId,
      page: pageSnapshot,
      version: `v${this.version}`,
      timestamp: Date.now(),
    };
  }

  public async applyOperation(op: DesignOperation): Promise<OperationResult> {
    const opId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    // Guard: Page locked
    if (this.page.locked) {
      return {
        operationId: opId,
        operation: op,
        success: false,
        timestamp: now,
        verified: false,
        error: "Page is locked. Modifications are prohibited.",
      };
    }

    if (op.type === "update_background_color") {
      const previousValue = { backgroundColor: this.page.backgroundColor };
      this.page.backgroundColor = op.color;
      this.version++;
      return {
        operationId: opId,
        operation: op,
        success: true,
        timestamp: now,
        previousValue,
        newValue: { backgroundColor: op.color },
        verified: true,
      };
    }

    // Target element operations
    const targetElement = this.registry.getRef<SimulatedElement>(op.targetElementId);
    if (!targetElement) {
      return {
        operationId: opId,
        operation: op,
        success: false,
        timestamp: now,
        targetElementId: op.targetElementId,
        verified: false,
        error: `Element '${op.targetElementId}' not found in active design session.`,
      };
    }

    // Guard: Element locked
    if (targetElement.locked) {
      return {
        operationId: opId,
        operation: op,
        success: false,
        timestamp: now,
        targetElementId: op.targetElementId,
        verified: false,
        error: `Target element '${op.targetElementId}' is locked. Cannot modify.`,
      };
    }

    let previousValue: Record<string, unknown> = {};
    let newValue: Record<string, unknown> = {};

    switch (op.type) {
      case "update_text_color": {
        if (targetElement.type !== "text") {
          return {
            operationId: opId,
            operation: op,
            success: false,
            timestamp: now,
            targetElementId: op.targetElementId,
            verified: false,
            error: `Target element is of type '${targetElement.type}', not 'text'.`,
          };
        }
        previousValue = { color: targetElement.color };
        targetElement.color = op.color;
        newValue = { color: op.color };
        break;
      }

      case "update_font_size": {
        if (targetElement.type !== "text") {
          return {
            operationId: opId,
            operation: op,
            success: false,
            timestamp: now,
            targetElementId: op.targetElementId,
            verified: false,
            error: `Target element is of type '${targetElement.type}', not 'text'.`,
          };
        }
        previousValue = { fontSize: targetElement.fontSize };
        targetElement.fontSize = op.fontSize;
        newValue = { fontSize: op.fontSize };
        break;
      }

      case "update_text_content": {
        if (targetElement.type !== "text") {
          return {
            operationId: opId,
            operation: op,
            success: false,
            timestamp: now,
            targetElementId: op.targetElementId,
            verified: false,
            error: `Target element is of type '${targetElement.type}', not 'text'.`,
          };
        }
        previousValue = { text: targetElement.text };
        targetElement.text = op.text;
        newValue = { text: op.text };
        break;
      }

      case "update_text_style": {
        if (targetElement.type !== "text") {
          return {
            operationId: opId,
            operation: op,
            success: false,
            timestamp: now,
            targetElementId: op.targetElementId,
            verified: false,
            error: `Target element is of type '${targetElement.type}', not 'text'.`,
          };
        }
        previousValue = {
          color: targetElement.color,
          fontSize: targetElement.fontSize,
          fontWeight: targetElement.fontWeight,
          fontStyle: targetElement.fontStyle,
          textAlign: targetElement.textAlign,
        };

        if (op.color !== undefined) targetElement.color = op.color;
        if (op.fontSize !== undefined) targetElement.fontSize = op.fontSize;
        if (op.fontWeight !== undefined) targetElement.fontWeight = op.fontWeight;
        if (op.fontStyle !== undefined) targetElement.fontStyle = op.fontStyle;
        if (op.textAlign !== undefined) targetElement.textAlign = op.textAlign;

        newValue = {
          color: targetElement.color,
          fontSize: targetElement.fontSize,
          fontWeight: targetElement.fontWeight,
          fontStyle: targetElement.fontStyle,
          textAlign: targetElement.textAlign,
        };
        break;
      }

      case "move_element": {
        previousValue = { top: targetElement.top, left: targetElement.left };
        if (op.position.top !== undefined) targetElement.top = op.position.top;
        if (op.position.left !== undefined) targetElement.left = op.position.left;
        newValue = { top: targetElement.top, left: targetElement.left };
        break;
      }

      case "update_fill_color": {
        previousValue = { fillColor: targetElement.fillColor };
        targetElement.fillColor = op.fillColor;
        newValue = { fillColor: op.fillColor };
        break;
      }

      case "delete_element": {
        const index = this.page.elements.indexOf(targetElement);
        if (index !== -1) {
          previousValue = { deleted: false, element: { ...targetElement } };
          this.page.elements.splice(index, 1);
          newValue = { deleted: true };
        }
        break;
      }

      default:
        return {
          operationId: opId,
          operation: op,
          success: false,
          timestamp: now,
          verified: false,
          error: `Unsupported operation: ${(op as { type: string }).type}`,
        };
    }

    // Increment version upon successful mutation
    this.version++;

    // Canva sync simulation: element mutated and verified
    return {
      operationId: opId,
      operation: op,
      success: true,
      timestamp: now,
      targetElementId: op.targetElementId,
      previousValue,
      newValue,
      verified: true,
    };
  }

  public async applyBatch(ops: DesignOperation[]): Promise<OperationResult[]> {
    const results: OperationResult[] = [];
    for (const op of ops) {
      const res = await this.applyOperation(op);
      results.push(res);
      if (!res.success) {
        // Stop batch on first failure to maintain deterministic atomic state
        break;
      }
    }
    return results;
  }

  public async verifyElement(
    elementId: string,
    expectedProperties: Partial<ElementSnapshot>
  ): Promise<VerificationResult> {
    const snapshot = await this.getSnapshot();
    const element = snapshot.page.elements.find((el) => el.id === elementId);

    if (!element) {
      return {
        verified: false,
        elementId,
        actual: null,
        message: `Element '${elementId}' not found in current snapshot.`,
      };
    }

    const diff: Record<string, { expected: unknown; actual: unknown }> = {};
    let matched = true;

    if (expectedProperties.geometry) {
      if (
        expectedProperties.geometry.top !== undefined &&
        element.geometry.top !== expectedProperties.geometry.top
      ) {
        matched = false;
        diff["geometry.top"] = {
          expected: expectedProperties.geometry.top,
          actual: element.geometry.top,
        };
      }
      if (
        expectedProperties.geometry.left !== undefined &&
        element.geometry.left !== expectedProperties.geometry.left
      ) {
        matched = false;
        diff["geometry.left"] = {
          expected: expectedProperties.geometry.left,
          actual: element.geometry.left,
        };
      }
    }

    if (expectedProperties.formatting) {
      if (
        expectedProperties.formatting.color !== undefined &&
        element.formatting?.color !== expectedProperties.formatting.color
      ) {
        matched = false;
        diff["formatting.color"] = {
          expected: expectedProperties.formatting.color,
          actual: element.formatting?.color,
        };
      }
      if (
        expectedProperties.formatting.fontSize !== undefined &&
        element.formatting?.fontSize !== expectedProperties.formatting.fontSize
      ) {
        matched = false;
        diff["formatting.fontSize"] = {
          expected: expectedProperties.formatting.fontSize,
          actual: element.formatting?.fontSize,
        };
      }
    }

    if (
      expectedProperties.fillColor !== undefined &&
      element.fillColor !== expectedProperties.fillColor
    ) {
      matched = false;
      diff["fillColor"] = {
        expected: expectedProperties.fillColor,
        actual: element.fillColor,
      };
    }

    return {
      verified: matched,
      elementId,
      actual: element,
      diff: matched ? undefined : diff,
    };
  }

  public async refresh(): Promise<void> {
    this.version++;
  }
}
