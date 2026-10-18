import { ExecutionPlan, OperationResult } from "@canva-cursor/shared";

export type AgentStepStatus =
  | "IDLE"
  | "ANALYZING_INSTRUCTION"
  | "QUERYING_GRAPH"
  | "RESOLVING_TARGETS"
  | "NEED_CLARIFICATION"
  | "GENERATING_PLAN"
  | "VALIDATING_PLAN"
  | "AWAITING_CONFIRMATION"
  | "EXECUTING_OPERATIONS"
  | "VERIFYING_RESULTS"
  | "RECONCILING_GRAPH"
  | "COMPLETED"
  | "FAILED";

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
  currentStep: AgentStepStatus;
  plan?: ExecutionPlan;
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
