import { ElementGeometry } from "@canva-cursor/shared";
import { RelationshipEdge } from "../models/edge.js";

const ALIGNMENT_TOLERANCE_PX = 4;
const PROXIMITY_THRESHOLD_PX = 80;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

function toBox(g: ElementGeometry): Box {
  return {
    top: g.top,
    left: g.left,
    width: g.width,
    height: g.height,
    right: g.left + g.width,
    bottom: g.top + g.height,
    centerX: g.left + g.width / 2,
    centerY: g.top + g.height / 2,
  };
}

/**
 * Calculates Euclidean distance between two Axis-Aligned Bounding Boxes.
 * Returns 0 if they overlap.
 */
function calculateBoxDistance(a: Box, b: Box): number {
  const dx = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
  const dy = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates AABB intersection area between two boxes.
 */
function calculateIntersection(a: Box, b: Box) {
  const xLeft = Math.max(a.left, b.left);
  const yTop = Math.max(a.top, b.top);
  const xRight = Math.min(a.right, b.right);
  const yBottom = Math.min(a.bottom, b.bottom);

  if (xRight > xLeft && yBottom > yTop) {
    const width = xRight - xLeft;
    const height = yBottom - yTop;
    return {
      intersectionArea: width * height,
      intersectionBox: { top: yTop, left: xLeft, width, height },
    };
  }
  return null;
}

/**
 * Computes all grounded spatial edges between elements.
 */
export function computeSpatialRelationships(
  elements: Array<{ id: string; geometry: ElementGeometry }>
): RelationshipEdge[] {
  const edges: RelationshipEdge[] = [];
  const boxes = new Map<string, Box>();

  for (const el of elements) {
    boxes.set(el.id, toBox(el.geometry));
  }

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const idA = elements[i].id;
      const idB = elements[j].id;
      const boxA = boxes.get(idA)!;
      const boxB = boxes.get(idB)!;

      // 1. Check Alignment
      const alignments: Array<"left" | "right" | "top" | "bottom" | "center_x" | "center_y"> = [];

      if (Math.abs(boxA.left - boxB.left) <= ALIGNMENT_TOLERANCE_PX) alignments.push("left");
      if (Math.abs(boxA.right - boxB.right) <= ALIGNMENT_TOLERANCE_PX) alignments.push("right");
      if (Math.abs(boxA.top - boxB.top) <= ALIGNMENT_TOLERANCE_PX) alignments.push("top");
      if (Math.abs(boxA.bottom - boxB.bottom) <= ALIGNMENT_TOLERANCE_PX) alignments.push("bottom");
      if (Math.abs(boxA.centerX - boxB.centerX) <= ALIGNMENT_TOLERANCE_PX) alignments.push("center_x");
      if (Math.abs(boxA.centerY - boxB.centerY) <= ALIGNMENT_TOLERANCE_PX) alignments.push("center_y");

      for (const axis of alignments) {
        edges.push({
          id: `edge_align_${idA}_${idB}_${axis}`,
          sourceId: idA,
          targetId: idB,
          type: "ALIGNED_WITH",
          provenance: "grounded_geometry",
          metadata: { axis, delta: 0 },
        });
      }

      // 2. Check Overlap
      const overlap = calculateIntersection(boxA, boxB);
      if (overlap) {
        edges.push({
          id: `edge_overlap_${idA}_${idB}`,
          sourceId: idA,
          targetId: idB,
          type: "OVERLAPS",
          provenance: "grounded_geometry",
          metadata: overlap,
        });
      }

      // 3. Check Proximity (NEAR)
      const distance = calculateBoxDistance(boxA, boxB);
      if (distance > 0 && distance <= PROXIMITY_THRESHOLD_PX) {
        edges.push({
          id: `edge_near_${idA}_${idB}`,
          sourceId: idA,
          targetId: idB,
          type: "NEAR",
          provenance: "grounded_geometry",
          metadata: { distance: Math.round(distance) },
        });
      }

      // 4. Check Vertical Dominance (ABOVE / BELOW)
      const horizontalOverlap = Math.min(boxA.right, boxB.right) - Math.max(boxA.left, boxB.left) > -10;
      if (horizontalOverlap) {
        if (boxA.bottom <= boxB.top + 30) {
          edges.push({
            id: `edge_above_${idA}_${idB}`,
            sourceId: idA,
            targetId: idB,
            type: "ABOVE",
            provenance: "grounded_geometry",
            metadata: { distance: Math.max(0, boxB.top - boxA.bottom) },
          });
          edges.push({
            id: `edge_below_${idB}_${idA}`,
            sourceId: idB,
            targetId: idA,
            type: "BELOW",
            provenance: "grounded_geometry",
            metadata: { distance: Math.max(0, boxB.top - boxA.bottom) },
          });
        } else if (boxB.bottom <= boxA.top + 30) {
          edges.push({
            id: `edge_above_${idB}_${idA}`,
            sourceId: idB,
            targetId: idA,
            type: "ABOVE",
            provenance: "grounded_geometry",
            metadata: { distance: Math.max(0, boxA.top - boxB.bottom) },
          });
          edges.push({
            id: `edge_below_${idA}_${idB}`,
            sourceId: idA,
            targetId: idB,
            type: "BELOW",
            provenance: "grounded_geometry",
            metadata: { distance: Math.max(0, boxA.top - boxB.bottom) },
          });
        }
      }
    }
  }

  return edges;
}
