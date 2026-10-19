/**
 * verifier.ts
 *
 * Post-execution property verification for Canva Cursor operations.
 * Reads live properties from Canva to verify operations actually took effect.
 */

import { openDesign } from "@canva/design";
import type { OperationPlan, OperationResult } from "../shared/types";

function idToIndex(elementId: string): number | null {
  const match = elementId.match(/^el-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Pure property comparison helper. Supports numeric tolerance.
 */
export function compareProperty(expected: unknown, actual: unknown, tolerance = 0): boolean {
  if (typeof expected === "number" && typeof actual === "number") {
    return Math.abs(expected - actual) <= tolerance;
  }
  return expected === actual;
}

/**
 * Verifies operations in a single read-only openDesign session.
 */
export async function verifyResults(
  plan: OperationPlan,
  results: OperationResult[]
): Promise<OperationResult[]> {
  const verifiedResults: OperationResult[] = results.map((r) => ({ ...r }));

  await openDesign({ type: "current_page" }, async (session) => {
    const page = session.page;

    if (page.type !== "absolute") {
      verifiedResults.forEach((r) => {
        if (r.status === "succeeded") {
          r.status = "succeeded_unverified";
        }
      });
      return;
    }

    const elements = page.elements.toArray();

    for (const result of verifiedResults) {
      if (result.status !== "succeeded") {
        continue;
      }

      const op = plan.operations[result.operationIndex];
      if (!op) continue;

      switch (op.type) {
        case "update_text_style": {
          const idx = idToIndex(op.elementId);
          if (idx === null) {
            result.status = "succeeded_unverified";
            break;
          }
          const el = elements[idx];
          if (!el || el.type !== "text") {
            result.status = "succeeded_unverified";
            break;
          }

          const regions = el.text.readTextRegions();
          const firstRegion = regions[0];
          let verified = true;
          const verifiedProps: Record<string, unknown> = {};
          let mismatchError = "";

          if (op.formatting.color !== undefined) {
            const actualColor = firstRegion?.formatting?.color;
            verifiedProps.color = actualColor;
            if (!compareProperty(op.formatting.color, actualColor)) {
              verified = false;
              mismatchError = `Verification failed: expected ${op.formatting.color} got ${actualColor}`;
            }
          }

          if (verified && op.formatting.fontSize !== undefined) {
            const actualFontSize = firstRegion?.formatting?.fontSize;
            verifiedProps.fontSize = actualFontSize;
            if (!compareProperty(op.formatting.fontSize, actualFontSize)) {
              verified = false;
              mismatchError = `Verification failed: expected ${op.formatting.fontSize} got ${actualFontSize}`;
            }
          }

          if (verified) {
            result.verifiedProperties = verifiedProps;
          } else {
            result.status = "failed";
            result.errorMessage = mismatchError;
          }
          break;
        }

        case "update_fill_color": {
          const idx = idToIndex(op.elementId);
          if (idx === null) {
            result.status = "succeeded_unverified";
            break;
          }
          const el = elements[idx];
          if (!el) {
            result.status = "succeeded_unverified";
            break;
          }

          if (el.type === "rect") {
            const colorRef = el.fill.colorContainer?.ref;
            if (colorRef?.type !== "solid") {
              result.status = "succeeded_unverified";
              break;
            }
            const actualColor = colorRef.color;
            if (compareProperty(op.color, actualColor)) {
              result.verifiedProperties = { color: actualColor };
            } else {
              result.status = "failed";
              result.errorMessage = `Verification failed: expected ${op.color} got ${actualColor}`;
            }
          } else if (el.type === "shape") {
            const firstPath = el.paths.toArray()[0];
            const colorRef = firstPath?.fill.colorContainer?.ref;
            if (colorRef?.type !== "solid") {
              result.status = "succeeded_unverified";
              break;
            }
            const actualColor = colorRef.color;
            if (compareProperty(op.color, actualColor)) {
              result.verifiedProperties = { color: actualColor };
            } else {
              result.status = "failed";
              result.errorMessage = `Verification failed: expected ${op.color} got ${actualColor}`;
            }
          } else {
            result.status = "succeeded_unverified";
          }
          break;
        }

        case "update_background_color": {
          if (!page.background) {
            result.status = "succeeded_unverified";
            break;
          }
          const colorRef = page.background.colorContainer?.ref;
          if (colorRef?.type !== "solid") {
            result.status = "succeeded_unverified";
            break;
          }
          const actualColor = colorRef.color;
          if (compareProperty(op.color, actualColor)) {
            result.verifiedProperties = { color: actualColor };
          } else {
            result.status = "failed";
            result.errorMessage = `Verification failed: expected ${op.color} got ${actualColor}`;
          }
          break;
        }

        case "move_element": {
          const idx = idToIndex(op.elementId);
          if (idx === null) {
            result.status = "succeeded_unverified";
            break;
          }
          const el = elements[idx];
          if (!el) {
            result.status = "succeeded_unverified";
            break;
          }

          const actualTop = el.top;
          const actualLeft = el.left;
          const topMatches = compareProperty(op.top, actualTop, 2);
          const leftMatches = compareProperty(op.left, actualLeft, 2);

          if (topMatches && leftMatches) {
            result.verifiedProperties = { top: actualTop, left: actualLeft };
          } else {
            result.status = "failed";
            result.errorMessage = `Verification failed: expected (${op.top}, ${op.left}) got (${actualTop}, ${actualLeft})`;
          }
          break;
        }

        case "update_text_content": {
          const idx = idToIndex(op.elementId);
          if (idx === null) {
            result.status = "succeeded_unverified";
            break;
          }
          const el = elements[idx];
          if (!el || el.type !== "text") {
            result.status = "succeeded_unverified";
            break;
          }

          const actualText = el.text.readPlaintext();
          if (compareProperty(op.newText, actualText)) {
            result.verifiedProperties = { plaintext: actualText };
          } else {
            result.status = "failed";
            result.errorMessage = `Verification failed: expected ${op.newText} got ${actualText}`;
          }
          break;
        }

        case "change_layer_order":
        case "delete_element":
        case "group_elements":
        case "ungroup_element":
        case "duplicate_element":
        default:
          result.status = "succeeded_unverified";
          break;
      }
    }
  });

  return verifiedResults;
}
