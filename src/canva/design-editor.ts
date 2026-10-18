/**
 * design-editor.ts
 *
 * Executes a validated OperationPlan against the live Canva design using the
 * openDesign API.
 *
 * EXECUTION MODEL:
 *   - All operations in a plan run inside a single openDesign callback to
 *     minimize round-trips and produce a single undo step.
 *   - session.sync() is called once at the end (batch pattern).
 *   - Each operation is tried independently; failures are recorded but do not
 *     automatically abort later independent operations.
 *
 * IMPORTANT: Runs in the browser. No Node.js APIs allowed.
 */

import { openDesign, type DesignEditing } from "@canva/design";
import type {
  OperationPlan,
  DesignOperation,
  OperationResult,
  UpdateTextStyleOp,
  UpdateFillColorOp,
  UpdateBackgroundColorOp,
  MoveElementOp,
  ResizeElementOp,
  ChangeLayerOrderOp,
  DeleteElementOp,
  UpdateTextContentOp,
} from "../shared/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find a non-locked element by its ID within the elements list.
 * Returns null if not found or if locked (with a logged reason).
 */
function findEditableElement(
  elements: DesignEditing.ElementList<DesignEditing.Element>,
  elementId: string
): DesignEditing.Element | null {
  const found = elements.toArray().find((el) => {
    return (el as unknown as { id: string }).id === elementId;
  });
  if (!found) {
    console.warn(`[design-editor] Element not found: ${elementId}`);
    return null;
  }
  if (found.locked) {
    console.warn(`[design-editor] Element is locked: ${elementId}`);
    return null;
  }
  return found;
}

// ─── Operation executors ──────────────────────────────────────────────────────

function executeUpdateTextStyle(
  op: UpdateTextStyleOp,
  elements: DesignEditing.ElementList<DesignEditing.Element>
): { success: boolean; error?: string } {
  const el = findEditableElement(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };
  if (el.type !== "text") return { success: false, error: `Element ${op.elementId} is not a text element (type: ${el.type})` };

  const textEl = el as DesignEditing.TextElement;
  const plaintext = textEl.text.readPlaintext();
  const range = op.range ?? { start: 0, length: plaintext.length };

  // Build the formatting object (only include defined fields)
  const fmt: Record<string, unknown> = {};
  if (op.formatting.color !== undefined) fmt.color = op.formatting.color;
  if (op.formatting.fontSize !== undefined) fmt.fontSize = op.formatting.fontSize;
  if (op.formatting.fontWeight !== undefined) fmt.fontWeight = op.formatting.fontWeight;
  if (op.formatting.fontStyle !== undefined) fmt.fontStyle = op.formatting.fontStyle;
  if (op.formatting.decoration !== undefined) fmt.decoration = op.formatting.decoration;

  if (op.formatting.textAlign !== undefined) {
    // textAlign is paragraph-level — use formatParagraph
    textEl.text.formatParagraph(range, { textAlign: op.formatting.textAlign });
  }

  // Apply inline formatting only if there are inline properties
  const inlineKeys = ["color", "fontSize", "fontWeight", "fontStyle", "decoration"];
  const hasInline = inlineKeys.some((k) => fmt[k] !== undefined);
  if (hasInline) {
    textEl.text.replaceText(range, plaintext.slice(range.start, range.start + range.length), fmt as Parameters<typeof textEl.text.replaceText>[2]);
  }

  return { success: true };
}

function executeUpdateFillColor(
  op: UpdateFillColorOp,
  elements: DesignEditing.ElementList<DesignEditing.Element>
): { success: boolean; error?: string } {
  const el = findEditableElement(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };

  if (el.type === "rect") {
    (el as DesignEditing.RectElement).fill.colorContainer.set({ type: "solid", color: op.color });
    return { success: true };
  }
  if (el.type === "shape") {
    const shapeEl = el as DesignEditing.ShapeElement;
    shapeEl.paths.forEach((path) => {
      path.fill.colorContainer.set({ type: "solid", color: op.color });
    });
    return { success: true };
  }
  return { success: false, error: `update_fill_color not supported for element type: ${el.type}` };
}

function executeUpdateBackgroundColor(
  op: UpdateBackgroundColorOp,
  page: DesignEditing.AbsolutePage
): { success: boolean; error?: string } {
  if (!page.background) {
    return { success: false, error: "Page has no background to update" };
  }
  page.background.colorContainer.set({ type: "solid", color: op.color });
  return { success: true };
}

function executeMoveElement(
  op: MoveElementOp,
  elements: DesignEditing.ElementList<DesignEditing.Element>
): { success: boolean; error?: string } {
  const el = findEditableElement(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };

  el.top = op.top;
  el.left = op.left;
  return { success: true };
}

function executeResizeElement(
  op: ResizeElementOp,
  elements: DesignEditing.ElementList<DesignEditing.Element>
): { success: boolean; error?: string } {
  const el = findEditableElement(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };

  el.width = op.width;
  // Text elements have auto height — skip height update for them
  if (op.height !== undefined && el.type !== "text") {
    el.height = op.height;
  }
  return { success: true };
}

function executeChangeLayerOrder(
  op: ChangeLayerOrderOp,
  elements: DesignEditing.ElementList<DesignEditing.Element>
): { success: boolean; error?: string } {
  const target = findEditableElement(elements, op.elementId);
  if (!target) return { success: false, error: `Element ${op.elementId} not found or locked` };

  if (op.relativeElementId === null) {
    // Move to top of stack (last in collection = rendered on top)
    elements.moveAfter(elements.toArray().at(-1) ?? undefined, target);
    return { success: true };
  }

  const anchor = elements.toArray().find((el) => (el as unknown as { id: string }).id === op.relativeElementId);
  if (!anchor) return { success: false, error: `Anchor element ${op.relativeElementId} not found` };

  if (op.direction === "before") {
    elements.moveBefore(anchor, target);
  } else {
    elements.moveAfter(anchor, target);
  }
  return { success: true };
}

function executeDeleteElement(
  op: DeleteElementOp,
  elements: DesignEditing.ElementList<DesignEditing.Element>
): { success: boolean; error?: string } {
  const el = findEditableElement(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };

  elements.delete(el);
  return { success: true };
}

function executeUpdateTextContent(
  op: UpdateTextContentOp,
  elements: DesignEditing.ElementList<DesignEditing.Element>
): { success: boolean; error?: string } {
  const el = findEditableElement(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };
  if (el.type !== "text") return { success: false, error: `Element ${op.elementId} is not a text element` };

  const textEl = el as DesignEditing.TextElement;
  const currentLength = textEl.text.readPlaintext().length;

  if (op.preserveFormatting) {
    // Replace text in the full range without changing existing formatting
    textEl.text.replaceText(
      { start: 0, length: currentLength },
      op.newText
    );
  } else {
    textEl.text.replaceText(
      { start: 0, length: currentLength },
      op.newText,
      {}
    );
  }
  return { success: true };
}

// ─── Plan executor ────────────────────────────────────────────────────────────

/**
 * Executes a single operation and returns its result.
 * Requires the page and elements list from an active openDesign session.
 */
function executeOperation(
  op: DesignOperation,
  index: number,
  page: DesignEditing.AbsolutePage,
  elements: DesignEditing.ElementList<DesignEditing.Element>
): OperationResult {
  try {
    let opResult: { success: boolean; error?: string };

    switch (op.type) {
      case "update_text_style":
        opResult = executeUpdateTextStyle(op, elements);
        break;
      case "update_fill_color":
        opResult = executeUpdateFillColor(op, elements);
        break;
      case "update_background_color":
        opResult = executeUpdateBackgroundColor(op, page);
        break;
      case "move_element":
        opResult = executeMoveElement(op, elements);
        break;
      case "resize_element":
        opResult = executeResizeElement(op, elements);
        break;
      case "change_layer_order":
        opResult = executeChangeLayerOrder(op, elements);
        break;
      case "delete_element":
        opResult = executeDeleteElement(op, elements);
        break;
      case "update_text_content":
        opResult = executeUpdateTextContent(op, elements);
        break;
      default: {
        const exhaustiveCheck: never = op;
        opResult = { success: false, error: `Unknown operation type: ${(exhaustiveCheck as { type: string }).type}` };
      }
    }

    return {
      operationIndex: index,
      operationType: op.type,
      status: opResult.success ? "succeeded" : "failed",
      errorMessage: opResult.error,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[design-editor] Operation ${index} (${op.type}) threw:`, err);
    return {
      operationIndex: index,
      operationType: op.type,
      status: "failed",
      errorMessage: message,
    };
  }
}

/**
 * Executes an entire OperationPlan against the current page's live design.
 *
 * All operations run inside one openDesign callback; sync is called once at
 * the end. If a non-background operation fails, later operations that depend
 * on it (via the plan's `dependencies` field) are skipped.
 */
export async function executePlan(
  plan: OperationPlan
): Promise<OperationResult[]> {
  const results: OperationResult[] = [];

  await openDesign({ type: "current_page" }, async (session) => {
    const page = session.page;

    if (page.type !== "absolute") {
      // Mark all operations as failed for unsupported page type
      plan.operations.forEach((op, i) => {
        results.push({
          operationIndex: i,
          operationType: op.type,
          status: "failed",
          errorMessage: "Page type is not supported (not an absolute page)",
        });
      });
      return;
    }

    if (page.locked) {
      plan.operations.forEach((op, i) => {
        results.push({
          operationIndex: i,
          operationType: op.type,
          status: "failed",
          errorMessage: "Page is locked and cannot be edited",
        });
      });
      return;
    }

    // Build a set of failed operation indices for dependency checking
    const failedIndices = new Set<number>();

    for (let i = 0; i < plan.operations.length; i++) {
      const op = plan.operations[i];

      // Check if any dependency failed
      if (plan.dependencies) {
        const blockedBy = plan.dependencies
          .filter((dep) => dep.operationIndex === i)
          .find((dep) => failedIndices.has(dep.dependsOnIndex));

        if (blockedBy) {
          results.push({
            operationIndex: i,
            operationType: op.type,
            status: "skipped",
            errorMessage: `Skipped: depends on operation ${blockedBy.dependsOnIndex} which failed`,
          });
          failedIndices.add(i);
          continue;
        }
      }

      const result = executeOperation(op, i, page, page.elements);
      results.push(result);

      if (result.status === "failed") {
        failedIndices.add(i);
      }
    }

    // Batch sync: apply all successful mutations at once
    try {
      await session.sync();
    } catch (syncErr) {
      const message = syncErr instanceof Error ? syncErr.message : String(syncErr);
      console.error("[design-editor] sync() failed:", syncErr);
      // Mark all previously succeeded operations as unverified
      results.forEach((r) => {
        if (r.status === "succeeded") {
          r.status = "succeeded_unverified";
          r.errorMessage = `sync() failed: ${message}`;
        }
      });
    }
  });

  return results;
}
