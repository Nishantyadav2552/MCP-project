import { PageNode, ElementNode } from "./node.js";
import { RelationshipEdge, RelationshipType } from "./edge.js";

export class DesignKnowledgeGraph {
  public readonly pageNode: PageNode;
  public readonly nodes: Map<string, ElementNode> = new Map();
  public readonly edges: RelationshipEdge[] = [];

  // Fast indices
  private outgoingIndex: Map<string, RelationshipEdge[]> = new Map();
  private incomingIndex: Map<string, RelationshipEdge[]> = new Map();
  private roleIndex: Map<string, Set<string>> = new Map();
  private typeIndex: Map<string, Set<string>> = new Map();

  public stateHash = "";
  public updatedAt: number = Date.now();

  constructor(pageNode: PageNode) {
    this.pageNode = pageNode;
  }

  public addNode(node: ElementNode): void {
    this.nodes.set(node.id, node);

    // Index by semantic role
    const role = node.semanticRole.value;
    if (!this.roleIndex.has(role)) {
      this.roleIndex.set(role, new Set());
    }
    this.roleIndex.get(role)!.add(node.id);

    // Index by element type
    if (!this.typeIndex.has(node.type)) {
      this.typeIndex.set(node.type, new Set());
    }
    this.typeIndex.get(node.type)!.add(node.id);
  }

  public addEdge(edge: RelationshipEdge): void {
    this.edges.push(edge);

    if (!this.outgoingIndex.has(edge.sourceId)) {
      this.outgoingIndex.set(edge.sourceId, []);
    }
    this.outgoingIndex.get(edge.sourceId)!.push(edge);

    if (!this.incomingIndex.has(edge.targetId)) {
      this.incomingIndex.set(edge.targetId, []);
    }
    this.incomingIndex.get(edge.targetId)!.push(edge);
  }

  public getNode(id: string): ElementNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): ElementNode[] {
    return Array.from(this.nodes.values());
  }

  public getOutgoingEdges(nodeId: string, filterType?: RelationshipType): RelationshipEdge[] {
    const list = this.outgoingIndex.get(nodeId) || [];
    return filterType ? list.filter((e) => e.type === filterType) : list;
  }

  public getIncomingEdges(nodeId: string, filterType?: RelationshipType): RelationshipEdge[] {
    const list = this.incomingIndex.get(nodeId) || [];
    return filterType ? list.filter((e) => e.type === filterType) : list;
  }

  public getNodesByRole(role: string): ElementNode[] {
    const ids = this.roleIndex.get(role) || new Set();
    return Array.from(ids)
      .map((id) => this.nodes.get(id))
      .filter((n): n is ElementNode => n !== undefined);
  }

  public getNodesByType(type: string): ElementNode[] {
    const ids = this.typeIndex.get(type) || new Set();
    return Array.from(ids)
      .map((id) => this.nodes.get(id))
      .filter((n): n is ElementNode => n !== undefined);
  }

  /**
   * Serializes the graph to clean JSON for debugging, inspection, and MCP transport.
   */
  public toJSON() {
    return {
      page: this.pageNode,
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      stateHash: this.stateHash,
      updatedAt: this.updatedAt,
      nodes: Array.from(this.nodes.values()).map((n) => ({
        id: n.id,
        type: n.type,
        role: n.semanticRole.value,
        roleConfidence: n.semanticRole.confidence,
        text: n.text?.value,
        geometry: n.geometry.value,
        formatting: n.formatting?.value,
        fillColor: n.fillColor?.value,
        locked: n.locked.value,
      })),
      edges: this.edges.map((e) => ({
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        type: e.type,
        provenance: e.provenance,
        metadata: e.metadata,
      })),
    };
  }
}
