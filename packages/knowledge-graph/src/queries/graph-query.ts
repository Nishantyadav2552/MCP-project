import { DesignKnowledgeGraph } from "../models/graph.js";
import { ElementNode } from "../models/node.js";
import { AlignmentMetadata, ProximityMetadata } from "../models/edge.js";

export interface TargetResolutionCandidate {
  node: ElementNode;
  confidence: number;
  matchReasons: string[];
}

export class GraphQueryEngine {
  constructor(private graph: DesignKnowledgeGraph) {}

  /**
   * Finds the main heading node in the design.
   */
  public findMainHeading(): ElementNode | undefined {
    const headings = this.graph.getNodesByRole("heading_main");
    if (headings.length > 0) return headings[0];

    // Fallback: Largest font size text element in the upper half
    const textNodes = this.graph
      .getNodesByType("text")
      .filter((n) => n.geometry.value.top < this.graph.pageNode.dimensions.height * 0.7)
      .sort((a, b) => (b.formatting?.value.fontSize || 0) - (a.formatting?.value.fontSize || 0));

    return textNodes[0];
  }

  /**
   * Finds subtitle elements.
   */
  public findSubtitles(): ElementNode[] {
    const subs = this.graph.getNodesByRole("heading_sub");
    if (subs.length > 0) return subs;

    // Fallback: elements with semantic link to main heading
    const mainHeading = this.findMainHeading();
    if (!mainHeading) return [];

    const outgoing = this.graph.getOutgoingEdges(mainHeading.id, "SEMANTICALLY_RELATED_TO");
    return outgoing
      .map((e) => this.graph.getNode(e.targetId))
      .filter((n): n is ElementNode => n !== undefined);
  }

  /**
   * Finds elements aligned with the given node.
   */
  public getAlignedElements(
    nodeId: string,
    axis?: "left" | "right" | "top" | "bottom" | "center_x" | "center_y"
  ): Array<{ node: ElementNode; axis: string; delta: number }> {
    const outgoing = this.graph.getOutgoingEdges(nodeId, "ALIGNED_WITH");
    const incoming = this.graph.getIncomingEdges(nodeId, "ALIGNED_WITH");
    const results: Array<{ node: ElementNode; axis: string; delta: number }> = [];

    for (const edge of outgoing) {
      const meta = edge.metadata as AlignmentMetadata | undefined;
      if (!axis || meta?.axis === axis) {
        const target = this.graph.getNode(edge.targetId);
        if (target) {
          results.push({ node: target, axis: meta?.axis || "left", delta: meta?.delta || 0 });
        }
      }
    }

    for (const edge of incoming) {
      const meta = edge.metadata as AlignmentMetadata | undefined;
      if (!axis || meta?.axis === axis) {
        const source = this.graph.getNode(edge.sourceId);
        if (source) {
          results.push({ node: source, axis: meta?.axis || "left", delta: meta?.delta || 0 });
        }
      }
    }

    return results;
  }

  /**
   * Finds elements physically near the given element.
   */
  public getElementsNear(
    nodeId: string,
    maxDistancePx = 100
  ): Array<{ node: ElementNode; distance: number }> {
    const outgoing = this.graph.getOutgoingEdges(nodeId, "NEAR");
    const incoming = this.graph.getIncomingEdges(nodeId, "NEAR");
    const results: Array<{ node: ElementNode; distance: number }> = [];

    const processEdge = (targetNodeId: string, edge: { metadata?: unknown }) => {
      const meta = edge.metadata as ProximityMetadata | undefined;
      const distance = meta?.distance ?? 50;
      if (distance <= maxDistancePx) {
        const node = this.graph.getNode(targetNodeId);
        if (node) results.push({ node, distance });
      }
    };

    for (const e of outgoing) processEdge(e.targetId, e);
    for (const e of incoming) processEdge(e.sourceId, e);

    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Finds elements with matching or similar style.
   */
  public getSimilarlyStyledElements(nodeId: string): ElementNode[] {
    const outgoing = this.graph.getOutgoingEdges(nodeId, "SAME_STYLE_AS");
    const incoming = this.graph.getIncomingEdges(nodeId, "SAME_STYLE_AS");

    const matchedIds = new Set<string>();
    for (const e of outgoing) matchedIds.add(e.targetId);
    for (const e of incoming) matchedIds.add(e.sourceId);

    return Array.from(matchedIds)
      .map((id) => this.graph.getNode(id))
      .filter((n): n is ElementNode => n !== undefined);
  }

  /**
   * Finds elements containing specific text (case-insensitive fuzzy match).
   */
  public findElementsByText(textSnippet: string): ElementNode[] {
    const queryLower = textSnippet.toLowerCase().trim();
    return this.graph.getAllNodes().filter((n) => {
      if (!n.text?.value) return false;
      return n.text.value.toLowerCase().includes(queryLower);
    });
  }

  /**
   * Finds elements by their semantic role.
   */
  public findElementsByRole(role: string): ElementNode[] {
    return this.graph.getNodesByRole(role);
  }

  /**
   * Finds elements by type.
   */
  public findElementsByType(type: string): ElementNode[] {
    return this.graph.getNodesByType(type);
  }

  /**
   * Contextual Semantic Target Resolver:
   * Maps natural language terms ("main heading", "subtitle", "title", "blue button", "logo", etc.)
   * to candidate element nodes with confidence scores.
   */
  public resolveTarget(query: string): TargetResolutionCandidate[] {
    const q = query.toLowerCase().trim();
    const candidates: TargetResolutionCandidate[] = [];

    const allNodes = this.graph.getAllNodes();

    for (const node of allNodes) {
      let score = 0;
      const reasons: string[] = [];

      // 1. Semantic role match
      if (
        (q.includes("main heading") || q.includes("heading") || q.includes("title")) &&
        node.semanticRole.value === "heading_main"
      ) {
        score += 0.8;
        reasons.push("Matches semantic role 'heading_main'");
      } else if (
        (q.includes("subtitle") || q.includes("sub heading") || q.includes("sub-heading")) &&
        node.semanticRole.value === "heading_sub"
      ) {
        score += 0.85;
        reasons.push("Matches semantic role 'heading_sub'");
      } else if ((q.includes("button") || q.includes("cta")) && node.semanticRole.value === "cta") {
        score += 0.85;
        reasons.push("Matches semantic role 'cta'");
      } else if (q.includes("logo") && node.semanticRole.value === "logo") {
        score += 0.9;
        reasons.push("Matches semantic role 'logo'");
      } else if (q.includes("card") && node.semanticRole.value === "card") {
        score += 0.75;
        reasons.push("Matches semantic role 'card'");
      }

      // 2. Exact or substring text match
      if (node.text?.value) {
        const textVal = node.text.value.toLowerCase();
        if (q.includes(textVal)) {
          score += 0.7;
          reasons.push(`Contains exact text match: '${node.text.value}'`);
        } else if (textVal.includes(q)) {
          score += 0.6;
          reasons.push(`Element text includes query term`);
        }
      }

      // 3. ID match
      if (node.id === query || query.includes(node.id)) {
        score = 1.0;
        reasons.push("Direct handle ID match");
      }

      if (score > 0) {
        candidates.push({
          node,
          confidence: Math.min(1.0, score),
          matchReasons: reasons,
        });
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }
}
