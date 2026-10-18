import {
  DesignSnapshot,
  DesignOperation,
  OperationResult,
  ElementSnapshot,
} from "@canva-cursor/shared";
import { ICanvaAdapter, SimulationCanvaAdapter } from "@canva-cursor/canva-adapter";
import {
  DesignKnowledgeGraph,
  GraphBuilder,
  GraphQueryEngine,
  GraphSynchronizer,
} from "@canva-cursor/knowledge-graph";

export interface OperationHistoryEntry {
  operationId: string;
  timestamp: number;
  operation: DesignOperation;
  targetElementId?: string;
  success: boolean;
  verified: boolean;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  error?: string;
}

export class CanvaMcpService {
  private adapter: ICanvaAdapter;
  private graphBuilder = new GraphBuilder();
  private synchronizer = new GraphSynchronizer();
  
  private currentGraph: DesignKnowledgeGraph | null = null;
  private currentSnapshot: DesignSnapshot | null = null;
  private history: OperationHistoryEntry[] = [];

  constructor(adapter?: ICanvaAdapter) {
    this.adapter = adapter || new SimulationCanvaAdapter();
  }

  public setAdapter(adapter: ICanvaAdapter) {
    this.adapter = adapter;
    this.currentGraph = null;
    this.currentSnapshot = null;
  }

  public getAdapter(): ICanvaAdapter {
    return this.adapter;
  }

  /**
   * Refreshes and returns the current design snapshot and updated knowledge graph.
   */
  public async getOrRefreshGraph(): Promise<{
    snapshot: DesignSnapshot;
    graph: DesignKnowledgeGraph;
    query: GraphQueryEngine;
  }> {
    this.currentSnapshot = await this.adapter.getSnapshot();
    this.currentGraph = this.graphBuilder.buildFromSnapshot(this.currentSnapshot);
    const query = new GraphQueryEngine(this.currentGraph);
    return { snapshot: this.currentSnapshot, graph: this.currentGraph, query };
  }

  /**
   * Executes a design operation through the adapter, records the audit trail,
   * reconciles the knowledge graph, and returns structured results.
   */
  public async executeOperation(op: DesignOperation): Promise<OperationResult> {
    // 1. Ensure current graph exists and check staleness
    if (this.currentGraph && this.currentSnapshot) {
      const latestSnapshot = await this.adapter.getSnapshot();
      const staleness = this.synchronizer.checkStaleness(this.currentGraph, latestSnapshot);
      if (staleness.isStale) {
        // Automatically reconcile to ground operations in active state
        this.currentSnapshot = latestSnapshot;
        this.currentGraph = this.synchronizer.reconcile(latestSnapshot);
      }
    }

    // 2. Execute through Canva Adapter
    const result = await this.adapter.applyOperation(op);

    // 3. Record history entry
    this.history.push({
      operationId: result.operationId,
      timestamp: result.timestamp,
      operation: result.operation,
      targetElementId: result.targetElementId,
      success: result.success,
      verified: result.verified,
      previousValue: result.previousValue,
      newValue: result.newValue,
      error: result.error,
    });

    // 4. If mutation succeeded, refresh snapshot & graph
    if (result.success) {
      this.currentSnapshot = await this.adapter.getSnapshot();
      this.currentGraph = this.graphBuilder.buildFromSnapshot(this.currentSnapshot);
    }

    return result;
  }

  /**
   * Returns recent operation history.
   */
  public getHistory(limit = 20): OperationHistoryEntry[] {
    return this.history.slice(-limit);
  }

  /**
   * Verifies an element's live properties against expectations.
   */
  public async verifyElement(elementId: string, expected: Partial<ElementSnapshot>) {
    return this.adapter.verifyElement(elementId, expected);
  }
}
