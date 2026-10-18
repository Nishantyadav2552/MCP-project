import { ElementGeometry } from "@canva-cursor/shared";
import { PageNode } from "@canva-cursor/knowledge-graph";

export interface TargetPosition {
  top?: number;
  left?: number;
}

const DEFAULT_MARGIN_PX = 40;

/**
 * Computes deterministic target coordinates based on page dimensions,
 * element geometry, and natural language positioning terms.
 */
export function calculateTargetPosition(
  phrase: string,
  elementGeometry: ElementGeometry,
  page: PageNode
): TargetPosition | null {
  const p = phrase.toLowerCase();
  const pageWidth = page.dimensions.width;
  const pageHeight = page.dimensions.height;

  // 1. "top of the page" / "to the top"
  if (p.includes("top of the page") || p.includes("to the top") || p.includes("move to top")) {
    return { top: DEFAULT_MARGIN_PX };
  }

  // 2. "bottom-right corner" / "bottom right"
  if (p.includes("bottom-right") || p.includes("bottom right")) {
    return {
      top: Math.max(0, pageHeight - elementGeometry.height - DEFAULT_MARGIN_PX),
      left: Math.max(0, pageWidth - elementGeometry.width - DEFAULT_MARGIN_PX),
    };
  }

  // 3. "bottom-left corner" / "bottom left"
  if (p.includes("bottom-left") || p.includes("bottom left")) {
    return {
      top: Math.max(0, pageHeight - elementGeometry.height - DEFAULT_MARGIN_PX),
      left: DEFAULT_MARGIN_PX,
    };
  }

  // 4. "bottom of the page" / "to the bottom"
  if (p.includes("bottom of the page") || p.includes("to the bottom")) {
    return {
      top: Math.max(0, pageHeight - elementGeometry.height - DEFAULT_MARGIN_PX),
    };
  }

  // 5. "center" / "center of the page"
  if (p.includes("center of the page") || p.includes("to the center") || p.includes("center it")) {
    return {
      top: Math.round(pageHeight / 2 - elementGeometry.height / 2),
      left: Math.round(pageWidth / 2 - elementGeometry.width / 2),
    };
  }

  // 6. Direct numeric coordinate match (e.g. "top: 50" or "left: 100")
  const topMatch = p.match(/top:?\s*(\d+)/);
  const leftMatch = p.match(/left:?\s*(\d+)/);

  if (topMatch || leftMatch) {
    return {
      top: topMatch ? parseInt(topMatch[1], 10) : undefined,
      left: leftMatch ? parseInt(leftMatch[1], 10) : undefined,
    };
  }

  return null;
}
