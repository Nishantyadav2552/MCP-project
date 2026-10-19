/**
 * design-editor.ts
 *
 * Executes a validated OperationPlan against the live Canva design.
 *
 * ELEMENT ID CONVENTION: IDs are "el-{index}" where index is the element's
 * position in page.elements.toArray(). The snapshot-builder assigns these
 * same IDs, so the backend planner can reference elements by index.
 *
 * EXECUTION MODEL:
 *   - All operations run inside one openDesign callback (single undo step).
 *   - session.sync() is called once at the end (batch pattern).
 *   - Failures are recorded but don't abort later independent operations.
 *
 * Runs in the browser. No Node.js APIs.
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
  ChangeLayerOrderOp,
  DeleteElementOp,
  UpdateTextContentOp,
  GroupElementsOp,
  UngroupElementOp,
  DuplicateElementOp,
} from "../shared/types";

// ─── ID → index resolution ────────────────────────────────────────────────────

function idToIndex(elementId: string): number | null {
  const match = elementId.match(/^el-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

function findByIndex(
  elements: DesignEditing.ElementList,
  elementId: string
): DesignEditing.AbsoluteElement | null {
  const idx = idToIndex(elementId);
  if (idx === null) {
    console.warn(`[design-editor] Cannot parse element ID: ${elementId}`);
    return null;
  }
  const arr = elements.toArray();
  const el = arr[idx];
  if (!el) {
    console.warn(`[design-editor] No element at index ${idx} (total: ${arr.length})`);
    return null;
  }
  if (el.locked) {
    console.warn(`[design-editor] Element at index ${idx} is locked`);
    return null;
  }
  return el;
}

// ─── Operation executors ──────────────────────────────────────────────────────

function executeUpdateTextStyle(
  op: UpdateTextStyleOp,
  elements: DesignEditing.ElementList
): { success: boolean; error?: string } {
  const el = findByIndex(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };
  if (el.type !== "text") return { success: false, error: `Element ${op.elementId} is not a text (type: ${el.type})` };

  const textEl = el;
  const plaintext = textEl.text.readPlaintext();
  const length = op.range?.length ?? plaintext.length;
  const index = op.range?.index ?? 0;
  const bounds = { index, length };

  // Paragraph-level: textAlign
  if (op.formatting.textAlign !== undefined) {
    textEl.text.formatParagraph(bounds, { textAlign: op.formatting.textAlign });
  }

  // Inline formatting: replace the same text, applying new formatting
  const inlineFormatting: Record<string, unknown> = {};
  if (op.formatting.color !== undefined) inlineFormatting.color = op.formatting.color;
  if (op.formatting.fontSize !== undefined) inlineFormatting.fontSize = op.formatting.fontSize;
  if (op.formatting.fontWeight !== undefined) inlineFormatting.fontWeight = op.formatting.fontWeight;
  if (op.formatting.fontStyle !== undefined) inlineFormatting.fontStyle = op.formatting.fontStyle;
  if (op.formatting.decoration !== undefined) inlineFormatting.decoration = op.formatting.decoration;

  const hasInline = Object.keys(inlineFormatting).length > 0;
  if (hasInline) {
    const segment = plaintext.slice(index, index + length);
    textEl.text.replaceText(bounds, segment, inlineFormatting as Parameters<typeof textEl.text.replaceText>[2]);
  }

  return { success: true };
}

function executeUpdateFillColor(
  op: UpdateFillColorOp,
  elements: DesignEditing.ElementList
): { success: boolean; error?: string } {
  const el = findByIndex(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };

  if (el.type === "rect") {
    el.fill.colorContainer.set({ type: "solid", color: op.color });
    return { success: true };
  }
  if (el.type === "shape") {
    el.paths.forEach((path) => {
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
  elements: DesignEditing.ElementList
): { success: boolean; error?: string } {
  const el = findByIndex(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };
  if (el.type === "unsupported") return { success: false, error: `Cannot move unsupported element` };

  el.top = op.top;
  el.left = op.left;
  return { success: true };
}


function executeChangeLayerOrder(
  op: ChangeLayerOrderOp,
  elements: DesignEditing.ElementList
): { success: boolean; error?: string } {
  const target = findByIndex(elements, op.elementId);
  if (!target) return { success: false, error: `Element ${op.elementId} not found or locked` };

  if (op.relativeElementId === null) {
    // Move to top of stack (last in array = rendered on top)
    const arr = elements.toArray();
    const last = arr[arr.length - 1];
    if (last && last !== target) {
      elements.moveAfter(last, target);
    }
    return { success: true };
  }

  const anchorIdx = idToIndex(op.relativeElementId);
  if (anchorIdx === null) return { success: false, error: `Invalid anchor ID: ${op.relativeElementId}` };

  const anchor = elements.toArray()[anchorIdx];
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
  elements: DesignEditing.ElementList
): { success: boolean; error?: string } {
  const el = findByIndex(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };

  elements.delete(el);
  return { success: true };
}

function executeUpdateTextContent(
  op: UpdateTextContentOp,
  elements: DesignEditing.ElementList
): { success: boolean; error?: string } {
  const el = findByIndex(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };
  if (el.type !== "text") return { success: false, error: `Element ${op.elementId} is not a text element` };

  const plaintext = el.text.readPlaintext();
  const bounds = { index: 0, length: plaintext.length };

  if (op.preserveFormatting) {
    el.text.replaceText(bounds, op.newText);
  } else {
    el.text.replaceText(bounds, op.newText, {});
  }
  return { success: true };
}

// ─── Plan executor ────────────────────────────────────────────────────────────

async function executeGroupElements(
  op: GroupElementsOp,
  elements: DesignEditing.ElementList,
  helpers: DesignEditing.PageHelpers
): Promise<{ success: boolean; error?: string }> {
  const resolvedElements: Exclude<DesignEditing.GroupContentElement, DesignEditing.UnsupportedElement>[] = [];

  for (const id of op.elementIds) {
    const el = findByIndex(elements, id);
    if (!el) {
      return { success: false, error: `Element ${id} not found or locked` };
    }
    if (el.type === "unsupported" || el.type === "group") {
      return { success: false, error: `Element ${id} cannot be grouped (type: ${el.type})` };
    }
    resolvedElements.push(el);
  }

  if (resolvedElements.length < 2) {
    return { success: false, error: "At least 2 valid elements are required to group" };
  }

  await helpers.group({ elements: resolvedElements });
  return { success: true };
}

async function executeUngroupElement(
  op: UngroupElementOp,
  elements: DesignEditing.ElementList,
  helpers: DesignEditing.PageHelpers
): Promise<{ success: boolean; error?: string }> {
  const el = findByIndex(elements, op.elementId);
  if (!el) {
    return { success: false, error: `Element ${op.elementId} not found or locked` };
  }
  if (el.type !== "group") {
    return { success: false, error: `Element ${op.elementId} is not a group (type: ${el.type})` };
  }

  await helpers.ungroup({ element: el });
  return { success: true };
}

function executeDuplicateElement(
  op: DuplicateElementOp,
  elements: DesignEditing.ElementList,
  helpers: DesignEditing.PageHelpers
): { success: boolean; error?: string } {
  const el = findByIndex(elements, op.elementId);
  if (!el) return { success: false, error: `Element ${op.elementId} not found or locked` };

  const top = el.top + (op.offsetTop ?? 20);
  const left = el.left + (op.offsetLeft ?? 20);

  switch (el.type) {
    case "text": {
      const newState = helpers.elementStateBuilder.createTextElement({
        top,
        left,
        width: el.width,
        text: { regions: el.text.readTextRegions() },
        rotation: el.rotation,
        transparency: el.transparency,
      });
      elements.insertAfter(el, newState);
      return { success: true };
    }
    case "rect": {
      let fill: DesignEditing.FillOpts | undefined;
      const colorRef = el.fill.colorContainer?.ref;
      const mediaRef = el.fill.mediaContainer?.ref;

      if (colorRef?.type === "solid") {
        fill = { colorContainer: { type: "solid", color: colorRef.color } };
      } else if (mediaRef?.type === "image") {
        fill = { mediaContainer: { type: "image", imageRef: mediaRef.imageRef, flipX: mediaRef.flipX, flipY: mediaRef.flipY } };
      } else if (mediaRef?.type === "video") {
        fill = { mediaContainer: { type: "video", videoRef: mediaRef.videoRef, flipX: mediaRef.flipX, flipY: mediaRef.flipY } };
      }

      const newState = helpers.elementStateBuilder.createRectElement({
        top,
        left,
        width: el.width,
        height: el.height,
        fill,
        rotation: el.rotation,
        transparency: el.transparency,
      });
      elements.insertAfter(el, newState);
      return { success: true };
    }
    case "shape": {
      const pathOptsList: DesignEditing.PathOpts[] = el.paths.toArray().map((path) => {
        const pathOpts: DesignEditing.PathOpts = { d: path.d };
        const colorRef = path.fill.colorContainer?.ref;
        const mediaRef = path.fill.mediaContainer?.ref;

        if (colorRef?.type === "solid") {
          pathOpts.fill = { colorContainer: { type: "solid", color: colorRef.color } };
        } else if (mediaRef?.type === "image") {
          pathOpts.fill = { mediaContainer: { type: "image", imageRef: mediaRef.imageRef, flipX: mediaRef.flipX, flipY: mediaRef.flipY } };
        } else if (mediaRef?.type === "video") {
          pathOpts.fill = { mediaContainer: { type: "video", videoRef: mediaRef.videoRef, flipX: mediaRef.flipX, flipY: mediaRef.flipY } };
        }
        return pathOpts;
      });

      const newState = helpers.elementStateBuilder.createShapeElement({
        top,
        left,
        width: el.width,
        height: el.height,
        viewBox: el.viewBox,
        paths: pathOptsList,
        rotation: el.rotation,
        transparency: el.transparency,
      });
      elements.insertAfter(el, newState);
      return { success: true };
    }
    case "embed": {
      const newState = helpers.elementStateBuilder.createEmbedElement({
        top,
        left,
        width: el.width,
        height: el.height,
        url: el.url,
        rotation: el.rotation,
        transparency: el.transparency,
      });
      elements.insertAfter(el, newState);
      return { success: true };
    }
    case "group":
    case "unsupported":
    default:
      return { success: false, error: "Cannot duplicate group or unsupported elements" };
  }
}

async function executeOperation(
  op: DesignOperation,
  index: number,
  page: DesignEditing.AbsolutePage,
  elements: DesignEditing.ElementList,
  helpers: DesignEditing.PageHelpers
): Promise<OperationResult> {
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
      case "change_layer_order":
        opResult = executeChangeLayerOrder(op, elements);
        break;
      case "delete_element":
        opResult = executeDeleteElement(op, elements);
        break;
      case "update_text_content":
        opResult = executeUpdateTextContent(op, elements);
        break;
      case "group_elements":
        opResult = await executeGroupElements(op, elements, helpers);
        break;
      case "ungroup_element":
        opResult = await executeUngroupElement(op, elements, helpers);
        break;
      case "duplicate_element":
        opResult = executeDuplicateElement(op, elements, helpers);
        break;
      default: {
        const _exhaustive: never = op;
        opResult = { success: false, error: `Unknown operation type` };
        void _exhaustive;
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

export function checkStaleness(snapshotCount: number, liveCount: number): boolean {
  return snapshotCount !== liveCount;
}

/**
 * Executes an OperationPlan against the current page.
 * All operations run in one openDesign callback; sync is called once at the end.
 */
export async function executePlan(plan: OperationPlan): Promise<OperationResult[]> {
  // Staleness guard: check if element count changed since snapshot
  let isStale = false;
  await openDesign({ type: "current_page" }, async (session) => {
    const page = session.page;
    if (page.type === "absolute") {
      const liveCount = page.elements.toArray().length;
      if (checkStaleness(plan.snapshotElementCount, liveCount)) {
        isStale = true;
      }
    }
  });

  if (isStale) {
    return plan.operations.map((op, i) => ({
      operationIndex: i,
      operationType: op.type,
      status: "failed",
      errorMessage: "Design was modified since the plan was created — please try again.",
    }));
  }

  const results: OperationResult[] = [];

  await openDesign({ type: "current_page" }, async (session) => {
    const page = session.page;

    if (page.type !== "absolute") {
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
          errorMessage: "Page is locked",
        });
      });
      return;
    }

    const failedIndices = new Set<number>();

    for (let i = 0; i < plan.operations.length; i++) {
      const op = plan.operations[i];

      // Skip if a dependency failed
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

      const result = await executeOperation(op, i, page, page.elements, session.helpers);
      results.push(result);
      if (result.status === "failed") failedIndices.add(i);
    }

    try {
      await session.sync();
    } catch (syncErr) {
      const message = syncErr instanceof Error ? syncErr.message : String(syncErr);
      console.error("[design-editor] sync() failed:", syncErr);
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
