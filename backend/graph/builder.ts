/**
 * graph/builder.ts
 *
 * Constructs a DesignGraph from a DesignSnapshot.
 * Separated into two passes:
 *   1. Node creation (element metadata + semantic annotation)
 *   2. Edge creation (spatial + style relationships)
 */

import type {
  DesignSnapshot,
  ElementSnapshot,
  TextElementSnapshot,
} from "../../src/shared/types";
import type {
  DesignGraph,
  GraphNode,
  SemanticAnnotation,
  SemanticRole,
} from "./models";
import { computeRelationships } from "./relationships";

// ─── Semantic role inference ──────────────────────────────────────────────────

/**
 * Infer the semantic role of a text element based on its font size, position,
 * and text content. This is heuristic inference — not authoritative Canva metadata.
 */
function inferTextRole(
  el: TextElementSnapshot,
  allTextElements: TextElementSnapshot[],
  pageDimensions: { width: number; height: number } | null
): SemanticAnnotation {
  const maxFontSize = Math.max(
    ...allTextElements.map((t) => {
      const sizes = t.regions.map((r) => r.formatting.fontSize ?? 0);
      return sizes.length ? Math.max(...sizes) : 0;
    })
  );

  const myFontSize = Math.max(...el.regions.map((r) => r.formatting.fontSize ?? 0));
  const text = el.plaintext.trim();
  const isBold = el.regions.some((r) => r.formatting.fontWeight === "bold");

  // Position-based heuristics
  const isNearTop = pageDimensions
    ? el.top < pageDimensions.height * 0.25
    : el.top < 200;

  const isShortText = text.length <= 60;
  const isVeryShortText = text.length <= 20;

  // Main heading: largest or near-largest font, typically short, near top
  if (myFontSize >= maxFontSize * 0.9 && isNearTop && isShortText) {
    return {
      role: "main_heading",
      confidence: 0.85,
      basis: `Largest font size (${myFontSize}px), near top of page, short text`,
    };
  }

  // Main heading without position constraint (fallback)
  if (myFontSize >= maxFontSize * 0.9 && isShortText && isBold) {
    return {
      role: "main_heading",
      confidence: 0.7,
      basis: `Largest bold font size (${myFontSize}px)`,
    };
  }

  // Subheading: second-largest font tier
  if (myFontSize >= maxFontSize * 0.7 && isShortText) {
    return {
      role: "subheading",
      confidence: 0.7,
      basis: `Large font size (${myFontSize}px, ${Math.round((myFontSize / maxFontSize) * 100)}% of max), short text`,
    };
  }

  // CTA: short, bold text (button labels)
  if (isVeryShortText && isBold && myFontSize > 12) {
    return {
      role: "call_to_action",
      confidence: 0.6,
      basis: "Short, bold text — likely a button label or CTA",
    };
  }

  // Caption: small font, short text
  if (myFontSize < 14 && isShortText) {
    return {
      role: "caption",
      confidence: 0.6,
      basis: `Small font size (${myFontSize}px)`,
    };
  }

  // Body text: longer content
  if (text.length > 60) {
    return {
      role: "body_text",
      confidence: 0.7,
      basis: `Long text content (${text.length} chars)`,
    };
  }

  return {
    role: "unknown",
    confidence: 0.3,
    basis: "Could not determine role from available properties",
  };
}

function inferElementRole(
  el: ElementSnapshot,
  allTextElements: TextElementSnapshot[],
  pageDimensions: { width: number; height: number } | null
): SemanticAnnotation {
  if (el.type === "text") {
    return inferTextRole(el, allTextElements, pageDimensions);
  }

  if (el.type === "rect" || el.type === "shape") {
    // Small shape near a corner → likely logo/icon
    const isSmall = el.width < 150 && el.height < 150;
    const isLarge = pageDimensions
      ? el.width > pageDimensions.width * 0.7 && el.height > pageDimensions.height * 0.7
      : false;

    if (isLarge) {
      return { role: "background_image", confidence: 0.7, basis: "Large rect covering most of the page" };
    }
    if (isSmall) {
      // Near corner = likely logo
      const nearLeftEdge = el.left < 100;
      const nearTopEdge = el.top < 100;
      if (nearLeftEdge && nearTopEdge) {
        return { role: "logo", confidence: 0.6, basis: "Small element in top-left corner" };
      }
    }
    return { role: "decorative", confidence: 0.5, basis: "Shape or rect element" };
  }

  if (el.type === "group") {
    return { role: "unknown", confidence: 0.3, basis: "Group element — role depends on children" };
  }

  return { role: "unknown", confidence: 0.1, basis: `Unrecognized element type: ${el.type}` };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a DesignGraph from a DesignSnapshot.
 * This is a synchronous in-memory operation — no I/O.
 */
export function buildGraph(snapshot: DesignSnapshot): DesignGraph {
  const allTextElements = snapshot.elements.filter(
    (el): el is TextElementSnapshot => el.type === "text"
  );

  // Pass 1: create nodes
  const nodes = new Map<string, GraphNode>();
  for (const el of snapshot.elements) {
    const semantics = inferElementRole(el, allTextElements, snapshot.dimensions);
    nodes.set(el.id, {
      elementId: el.id,
      snapshot: el,
      semantics,
      relationships: [], // filled in pass 2
    });
  }

  // Pass 2: compute relationships
  computeRelationships(nodes, snapshot);

  return {
    pageId: snapshot.pageId,
    pageDimensions: snapshot.dimensions,
    nodes,
    builtAt: Date.now(),
    sourceSnapshot: snapshot,
  };
}

/**
 * Update an existing graph with a new snapshot (after execution).
 * Rebuilds the graph — efficient enough for the element counts typical in Canva designs.
 */
export function refreshGraph(snapshot: DesignSnapshot): DesignGraph {
  return buildGraph(snapshot);
}
