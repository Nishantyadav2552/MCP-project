import { DesignSnapshot } from "@canva-cursor/shared";
import { DesignKnowledgeGraph } from "../models/graph.js";
import { GraphBuilder } from "../builder/graph-builder.js";

export interface StalenessCheckResult {
  isStale: boolean;
  cachedHash: string;
  currentHash: string;
  reason?: string;
}

export class GraphSynchronizer {
  private builder = new GraphBuilder();

  /**
   * Checks whether the in-memory graph is stale compared to the latest Canva snapshot.
   */
  public checkStaleness(
    cachedGraph: DesignKnowledgeGraph,
    currentSnapshot: DesignSnapshot
  ): StalenessCheckResult {
    const freshGraph = this.builder.buildFromSnapshot(currentSnapshot);

    const isStale = cachedGraph.stateHash !== freshGraph.stateHash;
    return {
      isStale,
      cachedHash: cachedGraph.stateHash,
      currentHash: freshGraph.stateHash,
      reason: isStale
        ? "Design canvas was modified out-of-band or by previous operations."
        : undefined,
    };
  }

  /**
   * Reconciles or rebuilds the graph from the confirmed post-mutation Canva snapshot.
   */
  public reconcile(currentSnapshot: DesignSnapshot): DesignKnowledgeGraph {
    return this.builder.buildFromSnapshot(currentSnapshot);
  }
}
