/**
 * graph/queries.ts
 *
 * Query functions for the DesignGraph.
 * These are used by the agent planner to resolve element targets from
 * natural-language descriptions.
 */

import type { ElementSnapshot, TextElementSnapshot } from "../../src/shared/types";
import type { DesignGraph, GraphNode, QueryResult, SemanticRole } from "./models";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toResult(node: GraphNode, score: number): QueryResult {
  return {
    elementId: node.elementId,
    snapshot: node.snapshot,
    semantics: node.semantics,
    score,
  };
}

// ─── Query functions ──────────────────────────────────────────────────────────

/**
 * Find elements with a specific semantic role, ordered by confidence.
 */
export function findByRole(graph: DesignGraph, role: SemanticRole): QueryResult[] {
  const results: QueryResult[] = [];
  for (const node of graph.nodes.values()) {
    if (node.semantics.role === role) {
      results.push(toResult(node, node.semantics.confidence));
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Find the most likely main heading(s).
 * Returns multiple candidates if confidence is close (potential ambiguity).
 */
export function findMainHeadings(graph: DesignGraph): QueryResult[] {
  return findByRole(graph, "main_heading");
}

/**
 * Find all text elements.
 */
export function findTextElements(graph: DesignGraph): QueryResult[] {
  const results: QueryResult[] = [];
  for (const node of graph.nodes.values()) {
    if (node.snapshot.type === "text") {
      results.push(toResult(node, 1.0));
    }
  }
  return results;
}

/**
 * Find elements by their element type.
 */
export function findByType(graph: DesignGraph, type: ElementSnapshot["type"]): QueryResult[] {
  const results: QueryResult[] = [];
  for (const node of graph.nodes.values()) {
    if (node.snapshot.type === type) {
      results.push(toResult(node, 1.0));
    }
  }
  return results;
}

/**
 * Find text elements whose plaintext contains the given substring (case-insensitive).
 */
export function findByText(graph: DesignGraph, text: string): QueryResult[] {
  const lower = text.toLowerCase();
  const results: QueryResult[] = [];
  for (const node of graph.nodes.values()) {
    if (node.snapshot.type === "text") {
      const el = node.snapshot as TextElementSnapshot;
      if (el.plaintext.toLowerCase().includes(lower)) {
        // Score by how much of the element's text matches
        const score = lower.length / el.plaintext.length;
        results.push(toResult(node, Math.min(1, score * 2)));
      }
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Find elements near a specific element.
 */
export function findNearElement(graph: DesignGraph, elementId: string): QueryResult[] {
  const node = graph.nodes.get(elementId);
  if (!node) return [];

  return node.relationships
    .filter((e) => e.type === "NEAR")
    .map((edge) => {
      const target = graph.nodes.get(edge.targetElementId);
      return target ? toResult(target, edge.confidence) : null;
    })
    .filter((r): r is QueryResult => r !== null)
    .sort((a, b) => b.score - a.score);
}

/**
 * Find elements that share the same style as a given element.
 */
export function findSameStyle(graph: DesignGraph, elementId: string): QueryResult[] {
  const node = graph.nodes.get(elementId);
  if (!node) return [];

  return node.relationships
    .filter((e) => e.type === "SAME_STYLE_AS")
    .map((edge) => {
      const target = graph.nodes.get(edge.targetElementId);
      return target ? toResult(target, edge.confidence) : null;
    })
    .filter((r): r is QueryResult => r !== null)
    .sort((a, b) => b.score - a.score);
}

/**
 * Find elements aligned with a specific element.
 */
export function findAlignedWith(graph: DesignGraph, elementId: string): QueryResult[] {
  const node = graph.nodes.get(elementId);
  if (!node) return [];

  return node.relationships
    .filter((e) => e.type === "ALIGNED_WITH")
    .map((edge) => {
      const target = graph.nodes.get(edge.targetElementId);
      return target
        ? toResult(target, edge.confidence)
        : null;
    })
    .filter((r): r is QueryResult => r !== null)
    .sort((a, b) => b.score - a.score);
}

/**
 * Find all headings (main_heading + subheading) sorted by font size descending.
 */
export function findAllHeadings(graph: DesignGraph): QueryResult[] {
  const headingRoles: SemanticRole[] = ["main_heading", "subheading", "subtitle"];
  const results: QueryResult[] = [];

  for (const node of graph.nodes.values()) {
    if (headingRoles.includes(node.semantics.role)) {
      results.push(toResult(node, node.semantics.confidence));
    }
  }

  return results.sort((a, b) => {
    // Sort by font size (largest first) as a secondary criterion
    const aFontSize =
      a.snapshot.type === "text"
        ? Math.max(...(a.snapshot as TextElementSnapshot).regions.map((r) => r.formatting.fontSize ?? 0))
        : 0;
    const bFontSize =
      b.snapshot.type === "text"
        ? Math.max(...(b.snapshot as TextElementSnapshot).regions.map((r) => r.formatting.fontSize ?? 0))
        : 0;
    if (Math.abs(a.score - b.score) > 0.1) return b.score - a.score;
    return bFontSize - aFontSize;
  });
}

/**
 * Get a node by element ID.
 */
export function getNode(graph: DesignGraph, elementId: string): GraphNode | null {
  return graph.nodes.get(elementId) ?? null;
}

/**
 * Serialize the graph to a compact summary suitable for including in LLM prompts.
 * Keeps only the most relevant fields to avoid token bloat.
 */
export function summarizeGraphForPrompt(graph: DesignGraph): string {
  const lines: string[] = [
    `Page: ${graph.pageId}`,
    `Dimensions: ${graph.pageDimensions ? `${graph.pageDimensions.width}×${graph.pageDimensions.height}px` : "unbounded"}`,
    `Elements (${graph.nodes.size}):`,
  ];

  for (const node of graph.nodes.values()) {
    const el = node.snapshot;
    let desc = `  [${el.id}] type=${el.type} pos=(${Math.round(el.top)},${Math.round(el.left)}) size=${Math.round(el.width)}×${Math.round(el.height)}`;

    if (el.type === "text") {
      const textEl = el as TextElementSnapshot;
      const maxSize = Math.max(...textEl.regions.map((r) => r.formatting.fontSize ?? 0));
      desc += ` text="${textEl.plaintext.slice(0, 50)}${textEl.plaintext.length > 50 ? "…" : ""}" fontSize=${maxSize}`;
    }

    desc += ` role=${node.semantics.role}(${Math.round(node.semantics.confidence * 100)}%)`;
    if (el.locked) desc += " [LOCKED]";
    lines.push(desc);
  }

  return lines.join("\n");
}
