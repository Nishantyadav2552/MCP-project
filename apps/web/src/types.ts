import { DesignSnapshot, OperationResult } from "@canva-cursor/shared";

export interface GraphNodeJSON {
  id: string;
  type: string;
  role: string;
  roleConfidence?: number;
  text?: string;
  geometry: {
    top: number;
    left: number;
    width: number;
    height: number;
    rotation: number;
    transparency: number;
  };
  formatting?: {
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textAlign?: string;
  };
  fillColor?: string;
  locked: boolean;
}

export interface GraphEdgeJSON {
  id: string;
  source: string;
  target: string;
  type: string;
  provenance: string;
  metadata?: Record<string, any> | any;
}

export interface DesignDataResponse {
  snapshot: DesignSnapshot;
  graph: {
    page: {
      id: string;
      dimensions: { width: number; height: number };
      backgroundColor?: string;
      locked: boolean;
    };
    nodeCount: number;
    edgeCount: number;
    stateHash: string;
    updatedAt: number;
    nodes: GraphNodeJSON[];
    edges: GraphEdgeJSON[];
  };
}

export interface ClarificationOption {
  id: string;
  label: string;
  elementId: string;
  description?: string;
}

export interface ClarificationRequest {
  question: string;
  ambiguousTerm: string;
  options: ClarificationOption[];
}

export interface AgentExecutionReport {
  executionId: string;
  instruction: string;
  status: "completed" | "partial" | "failed" | "need_clarification" | "awaiting_confirmation";
  currentStep: string;
  results: OperationResult[];
  clarification?: ClarificationRequest;
  explanation: string;
  summary: {
    totalPlanned: number;
    succeeded: number;
    failed: number;
    verified: number;
  };
  durationMs: number;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  report?: AgentExecutionReport;
  timestamp: number;
  isPending?: boolean;
}
