import {
  DesignSnapshot,
  DesignOperation,
  OperationResult,
  ElementSnapshot,
} from "@canva-cursor/shared";

export interface VerificationResult {
  verified: boolean;
  elementId: string;
  actual: ElementSnapshot | null;
  diff?: Record<string, { expected: unknown; actual: unknown }>;
  message?: string;
}

export interface ICanvaAdapter {
  readonly adapterType: "canva_sdk" | "simulation";
  
  /**
   * Reads the current active design state.
   */
  getSnapshot(): Promise<DesignSnapshot>;

  /**
   * Executes a single design operation.
   */
  applyOperation(op: DesignOperation): Promise<OperationResult>;

  /**
   * Executes an atomic batch of operations.
   */
  applyBatch(ops: DesignOperation[]): Promise<OperationResult[]>;

  /**
   * Verifies that the specified element has the expected properties after an edit.
   */
  verifyElement(
    elementId: string,
    expectedProperties: Partial<ElementSnapshot>
  ): Promise<VerificationResult>;

  /**
   * Refreshes the local cache / session state.
   */
  refresh(): Promise<void>;
}
