import { DesignSnapshot } from "@canva-cursor/shared";
import { DesignKnowledgeGraph } from "../models/graph.js";
import { PageNode, ElementNode } from "../models/node.js";
import { SemanticRoleClassifier } from "../semantic/role-classifier.js";
import { computeSpatialRelationships } from "../relationships/spatial.js";
import { computeStyleAndSemanticRelationships } from "../relationships/styling.js";

export class GraphBuilder {
  private roleClassifier = new SemanticRoleClassifier();

  public buildFromSnapshot(snapshot: DesignSnapshot): DesignKnowledgeGraph {
    const pageNode: PageNode = {
      id: snapshot.page.id,
      designId: snapshot.designId,
      type: snapshot.page.type,
      dimensions: snapshot.page.dimensions,
      backgroundColor: snapshot.page.backgroundColor,
      locked: snapshot.page.locked,
    };

    const graph = new DesignKnowledgeGraph(pageNode);

    // 1. Classify semantic roles for elements
    const classifiedRoles = this.roleClassifier.classifyAll(
      pageNode,
      snapshot.page.elements.map((el) => ({
        id: el.id,
        type: el.type,
        top: el.geometry.top,
        left: el.geometry.left,
        width: el.geometry.width,
        height: el.geometry.height,
        zIndex: el.zIndex,
        text: el.text,
        fontSize: el.formatting?.fontSize,
        fontWeight: el.formatting?.fontWeight,
        fillColor: el.fillColor,
      }))
    );

    // 2. Populate Nodes with Provenance
    const elementNodes: ElementNode[] = [];

    for (const el of snapshot.page.elements) {
      const roleProvenance = classifiedRoles.get(el.id) || {
        value: "unknown",
        source: "inferred_model",
        confidence: 0.1,
      };

      const node: ElementNode = {
        id: el.id,
        pageId: snapshot.page.id,
        designId: snapshot.designId,
        type: el.type,
        zIndex: el.zIndex,
        geometry: {
          value: { ...el.geometry },
          source: "canva_authoritative",
        },
        locked: {
          value: el.locked,
          source: "canva_authoritative",
        },
        text: el.text
          ? {
              value: el.text,
              source: "canva_authoritative",
            }
          : undefined,
        formatting: el.formatting
          ? {
              value: { ...el.formatting },
              source: "canva_authoritative",
            }
          : undefined,
        fillColor: el.fillColor
          ? {
              value: el.fillColor,
              source: "canva_authoritative",
            }
          : undefined,
        strokeColor: el.strokeColor
          ? {
              value: el.strokeColor,
              source: "canva_authoritative",
            }
          : undefined,
        strokeWidth: el.strokeWidth !== undefined
          ? {
              value: el.strokeWidth,
              source: "canva_authoritative",
            }
          : undefined,
        semanticRole: roleProvenance,
        version: snapshot.version,
        updatedAt: snapshot.timestamp,
      };

      graph.addNode(node);
      elementNodes.push(node);

      // Hierarchical CONTAINS edge from page to element
      graph.addEdge({
        id: `edge_contains_page_${node.id}`,
        sourceId: pageNode.id,
        targetId: node.id,
        type: "CONTAINS",
        provenance: "grounded_hierarchy",
      });
    }

    // 3. Compute Spatial Relationships
    const spatialEdges = computeSpatialRelationships(
      elementNodes.map((n) => ({ id: n.id, geometry: n.geometry.value }))
    );
    for (const edge of spatialEdges) {
      graph.addEdge(edge);
    }

    // 4. Compute Style & Semantic Relationships
    const styleEdges = computeStyleAndSemanticRelationships(elementNodes);
    for (const edge of styleEdges) {
      graph.addEdge(edge);
    }

    // 5. Compute State Hash
    graph.stateHash = this.computeStateHash(graph);
    graph.updatedAt = snapshot.timestamp;

    return graph;
  }

  /**
   * Deterministic hash representing the design graph's elements and spatial layout.
   */
  private computeStateHash(graph: DesignKnowledgeGraph): string {
    const rawTokens: string[] = [
      graph.pageNode.id,
      `${graph.pageNode.dimensions.width}x${graph.pageNode.dimensions.height}`,
      graph.pageNode.backgroundColor || "",
    ];

    const sortedNodes = graph.getAllNodes().sort((a, b) => a.id.localeCompare(b.id));
    for (const n of sortedNodes) {
      const g = n.geometry.value;
      rawTokens.push(
        `${n.id}:${n.type}:${Math.round(g.top)},${Math.round(g.left)},${Math.round(g.width)},${Math.round(g.height)}:${n.text?.value || ""}:${n.formatting?.value.color || ""}:${n.formatting?.value.fontSize || ""}`
      );
    }

    let hash = 0;
    const str = rawTokens.join("|");
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
}
