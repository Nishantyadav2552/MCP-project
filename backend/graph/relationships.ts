/**
 * graph/relationships.ts
 *
 * Computes spatial and style relationships between elements in a design graph.
 *
 * All spatial calculations use the coordinate system from the Canva Design Editing API:
 *   - top/left: absolute pixel position of the element's top-left corner
 *   - width/height: dimensions in pixels
 *
 * Relationships are marked with a confidence value reflecting how certain
 * the inference is (spatial is high confidence; style similarity is moderate).
 */

import type { DesignSnapshot, ElementSnapshot } from "../../src/shared/types";
import type { GraphNode, GraphEdge, RelationshipType } from "./models";

// ─── Geometry helpers ─────────────────────────────────────────────────────────

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getRect(el: ElementSnapshot): Rect {
  return { top: el.top, left: el.left, width: el.width, height: el.height };
}

function centerX(r: Rect): number { return r.left + r.width / 2; }
function centerY(r: Rect): number { return r.top + r.height / 2; }
function right(r: Rect): number { return r.left + r.width; }
function bottom(r: Rect): number { return r.top + r.height; }

function euclideanDistance(a: Rect, b: Rect): number {
  return Math.hypot(centerX(a) - centerX(b), centerY(a) - centerY(b));
}

/**
 * True if two elements are horizontally aligned (same vertical center, within threshold).
 */
function isHorizontallyAligned(a: Rect, b: Rect, threshold = 10): boolean {
  return Math.abs(centerY(a) - centerY(b)) < threshold;
}

/**
 * True if two elements are vertically aligned (same horizontal center, within threshold).
 */
function isVerticallyAligned(a: Rect, b: Rect, threshold = 10): boolean {
  return Math.abs(centerX(a) - centerX(b)) < threshold;
}

/**
 * True if two elements share left-edge alignment.
 */
function isLeftAligned(a: Rect, b: Rect, threshold = 5): boolean {
  return Math.abs(a.left - b.left) < threshold;
}

/**
 * True if two rects overlap (any part of their bounding boxes intersect).
 */
function doOverlap(a: Rect, b: Rect): boolean {
  return (
    a.left < right(b) &&
    right(a) > b.left &&
    a.top < bottom(b) &&
    bottom(a) > b.top
  );
}

// ─── Style similarity ─────────────────────────────────────────────────────────

function sameStyle(a: ElementSnapshot, b: ElementSnapshot): boolean {
  if (a.type !== "text" || b.type !== "text") return false;
  const aFontSize = Math.max(...a.regions.map((r) => r.formatting.fontSize ?? 0));
  const bFontSize = Math.max(...b.regions.map((r) => r.formatting.fontSize ?? 0));
  const aColor = a.regions[0]?.formatting.color;
  const bColor = b.regions[0]?.formatting.color;
  const aWeight = a.regions[0]?.formatting.fontWeight;
  const bWeight = b.regions[0]?.formatting.fontWeight;
  return (
    Math.abs(aFontSize - bFontSize) < 2 &&
    aColor === bColor &&
    aWeight === bWeight
  );
}

// ─── Relationship computation ─────────────────────────────────────────────────

/**
 * Determine the "NEAR" threshold based on page size.
 * Default: 15% of the shorter page dimension.
 */
function nearThreshold(snapshot: DesignSnapshot): number {
  if (!snapshot.dimensions) return 150;
  return Math.min(snapshot.dimensions.width, snapshot.dimensions.height) * 0.15;
}

/**
 * Compute all inter-element relationships and populate the `relationships`
 * arrays on each GraphNode.
 *
 * This is O(n²) but typical Canva designs have <100 elements, so it's fine.
 */
export function computeRelationships(
  nodes: Map<string, GraphNode>,
  snapshot: DesignSnapshot
): void {
  const nodeArray = Array.from(nodes.values());
  const threshold = nearThreshold(snapshot);

  for (let i = 0; i < nodeArray.length; i++) {
    for (let j = i + 1; j < nodeArray.length; j++) {
      const nodeA = nodeArray[i];
      const nodeB = nodeArray[j];
      const elA = nodeA.snapshot;
      const elB = nodeB.snapshot;
      const rectA = getRect(elA);
      const rectB = getRect(elB);
      const dist = euclideanDistance(rectA, rectB);

      // OVERLAPS
      if (doOverlap(rectA, rectB)) {
        addEdge(nodeA, nodeB, "OVERLAPS", 0.95);
        addEdge(nodeB, nodeA, "OVERLAPS", 0.95);
      }

      // NEAR (within threshold, not overlapping)
      if (dist <= threshold && !doOverlap(rectA, rectB)) {
        const conf = Math.max(0.4, 1 - dist / threshold);
        addEdge(nodeA, nodeB, "NEAR", conf, { distancePx: Math.round(dist) });
        addEdge(nodeB, nodeA, "NEAR", conf, { distancePx: Math.round(dist) });
      }

      // ABOVE / BELOW
      if (bottom(rectA) <= rectB.top) {
        addEdge(nodeA, nodeB, "ABOVE", 0.95, { gapPx: Math.round(rectB.top - bottom(rectA)) });
        addEdge(nodeB, nodeA, "BELOW", 0.95, { gapPx: Math.round(rectB.top - bottom(rectA)) });
      } else if (bottom(rectB) <= rectA.top) {
        addEdge(nodeB, nodeA, "ABOVE", 0.95, { gapPx: Math.round(rectA.top - bottom(rectB)) });
        addEdge(nodeA, nodeB, "BELOW", 0.95, { gapPx: Math.round(rectA.top - bottom(rectB)) });
      }

      // LEFT_OF / RIGHT_OF
      if (right(rectA) <= rectB.left) {
        addEdge(nodeA, nodeB, "LEFT_OF", 0.95);
        addEdge(nodeB, nodeA, "RIGHT_OF", 0.95);
      } else if (right(rectB) <= rectA.left) {
        addEdge(nodeB, nodeA, "LEFT_OF", 0.95);
        addEdge(nodeA, nodeB, "RIGHT_OF", 0.95);
      }

      // ALIGNED_WITH
      if (isHorizontallyAligned(rectA, rectB)) {
        addEdge(nodeA, nodeB, "ALIGNED_WITH", 0.9, { axis: "horizontal" });
        addEdge(nodeB, nodeA, "ALIGNED_WITH", 0.9, { axis: "horizontal" });
      } else if (isVerticallyAligned(rectA, rectB)) {
        addEdge(nodeA, nodeB, "ALIGNED_WITH", 0.9, { axis: "vertical" });
        addEdge(nodeB, nodeA, "ALIGNED_WITH", 0.9, { axis: "vertical" });
      } else if (isLeftAligned(rectA, rectB)) {
        addEdge(nodeA, nodeB, "ALIGNED_WITH", 0.85, { axis: "left-edge" });
        addEdge(nodeB, nodeA, "ALIGNED_WITH", 0.85, { axis: "left-edge" });
      }

      // SAME_STYLE_AS
      if (sameStyle(elA, elB)) {
        addEdge(nodeA, nodeB, "SAME_STYLE_AS", 0.8);
        addEdge(nodeB, nodeA, "SAME_STYLE_AS", 0.8);
      }
    }

    // CONTAINS (group → children)
    const node = nodeArray[i];
    if (node.snapshot.type === "group") {
      const group = node.snapshot;
      for (const childId of group.childIds) {
        const childNode = nodes.get(childId);
        if (childNode) {
          addEdge(node, childNode, "CONTAINS", 1.0);
        }
      }
    }
  }
}

function addEdge(
  from: GraphNode,
  to: GraphNode,
  type: RelationshipType,
  confidence: number,
  metadata?: Record<string, unknown>
): void {
  // Avoid duplicate edges of the same type to the same target
  const exists = from.relationships.some(
    (e) => e.type === type && e.targetElementId === to.elementId
  );
  if (!exists) {
    from.relationships.push({ type, targetElementId: to.elementId, confidence, metadata });
  }
}
