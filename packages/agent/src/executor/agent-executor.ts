import { CanvaMcpService } from "@canva-cursor/mcp-server";
import { InstructionPlanner } from "../planner/instruction-planner.js";
import { PlanValidator } from "../planner/plan-validator.js";
import {
  AgentExecutionReport,
  AgentStepStatus,
} from "../state-machine/agent-state.js";
import { OperationResult } from "@canva-cursor/shared";

export class AgentExecutor {
  private planner = new InstructionPlanner();
  private validator = new PlanValidator();

  constructor(private mcpService: CanvaMcpService) {}

  /**
   * Runs the full end-to-end agentic workflow:
   * Inspect -> Reason -> Resolve -> Plan -> Validate -> Execute -> Verify -> Reconcile -> Explain
   */
  public async execute(
    instruction: string,
    options?: { confirmed?: boolean }
  ): Promise<AgentExecutionReport> {
    const startTime = Date.now();
    const executionId = `exec_${startTime}_${Math.random().toString(36).slice(2, 7)}`;
    let currentStep: AgentStepStatus = "ANALYZING_INSTRUCTION";

    // 1. Query Design Knowledge Graph
    currentStep = "QUERYING_GRAPH";
    const { graph } = await this.mcpService.getOrRefreshGraph();

    // 2. Resolve Targets & Generate Plan
    currentStep = "RESOLVING_TARGETS";
    const planResult = this.planner.plan(instruction, graph);

    // Handle Clarification Requests
    if (planResult.clarification) {
      return {
        executionId,
        instruction,
        status: "need_clarification",
        currentStep: "NEED_CLARIFICATION",
        clarification: planResult.clarification,
        results: [],
        explanation: planResult.clarification.question,
        summary: { totalPlanned: 0, succeeded: 0, failed: 0, verified: 0 },
        durationMs: Date.now() - startTime,
      };
    }

    if (planResult.error || !planResult.plan) {
      return {
        executionId,
        instruction,
        status: "failed",
        currentStep: "FAILED",
        results: [],
        explanation: planResult.error || "Failed to generate execution plan from instruction.",
        summary: { totalPlanned: 0, succeeded: 0, failed: 0, verified: 0 },
        durationMs: Date.now() - startTime,
      };
    }

    const plan = planResult.plan;

    // 3. Validate Plan against Constraints
    currentStep = "VALIDATING_PLAN";
    const validation = this.validator.validatePlan(plan, graph);
    if (!validation.valid) {
      return {
        executionId,
        instruction,
        status: "failed",
        currentStep: "FAILED",
        plan,
        results: [],
        explanation: `Plan validation failed:\n- ${validation.errors.join("\n- ")}`,
        summary: { totalPlanned: plan.operations.length, succeeded: 0, failed: 0, verified: 0 },
        durationMs: Date.now() - startTime,
      };
    }

    // 4. Check Confirmation for Destructive Operations
    if (plan.requiresConfirmation && !options?.confirmed) {
      return {
        executionId,
        instruction,
        status: "awaiting_confirmation",
        currentStep: "AWAITING_CONFIRMATION",
        plan,
        results: [],
        explanation: `This plan contains destructive changes (${plan.operations.map((o) => o.type).join(", ")}). Please confirm to proceed.`,
        summary: { totalPlanned: plan.operations.length, succeeded: 0, failed: 0, verified: 0 },
        durationMs: Date.now() - startTime,
      };
    }

    // 5. Execute Operations Through MCP Service
    currentStep = "EXECUTING_OPERATIONS";
    const results: OperationResult[] = [];

    for (const op of plan.operations) {
      const res = await this.mcpService.executeOperation(op);
      results.push(res);
      if (!res.success) {
        // Stop execution on first failure to maintain clean recoverable state
        break;
      }
    }

    // 6. Verify Results & Reconcile Graph
    currentStep = "VERIFYING_RESULTS";
    const succeededCount = results.filter((r) => r.success).length;
    const verifiedCount = results.filter((r) => r.verified).length;
    const failedCount = results.filter((r) => !r.success).length;

    currentStep = "RECONCILING_GRAPH";
    await this.mcpService.getOrRefreshGraph();

    const allSucceeded = succeededCount === plan.operations.length;
    const someSucceeded = succeededCount > 0;
    const status = allSucceeded ? "completed" : someSucceeded ? "partial" : "failed";
    currentStep = allSucceeded ? "COMPLETED" : "FAILED";

    // 7. Generate Cursor-Style Human Explanation
    const explanation = this.generateExplanation(instruction, plan, results, status);

    return {
      executionId,
      instruction,
      status,
      currentStep,
      plan,
      results,
      explanation,
      summary: {
        totalPlanned: plan.operations.length,
        succeeded: succeededCount,
        failed: failedCount,
        verified: verifiedCount,
      },
      durationMs: Date.now() - startTime,
    };
  }

  private generateExplanation(
    instruction: string,
    plan: import("@canva-cursor/shared").ExecutionPlan,
    results: OperationResult[],
    status: string
  ): string {
    if (status === "completed") {
      const details = results
        .map((r) => {
          if (r.operation.type === "update_text_color") {
            return `• Changed text color of \`${r.targetElementId}\` from \`${r.previousValue?.color}\` to \`${r.newValue?.color}\``;
          }
          if (r.operation.type === "move_element") {
            return `• Moved \`${r.targetElementId}\` to (top: ${r.newValue?.top ?? "kept"}, left: ${r.newValue?.left ?? "kept"})`;
          }
          if (r.operation.type === "update_font_size") {
            return `• Updated font size of \`${r.targetElementId}\` to ${r.newValue?.fontSize}pt`;
          }
          if (r.operation.type === "update_background_color") {
            return `• Updated page background to \`${r.newValue?.backgroundColor}\``;
          }
          return `• Executed ${r.operation.type} successfully on \`${r.targetElementId || "page"}\``;
        })
        .join("\n");

      return `Successfully completed: "${instruction}"\n\nVerified modifications:\n${details}\n\nCanvas state synchronized and verified.`;
    }

    if (status === "partial") {
      const succeeded = results.filter((r) => r.success).map((r) => r.operation.type).join(", ");
      const failed = results.filter((r) => !r.success).map((r) => `${r.operation.type}: ${r.error}`).join(", ");
      return `Partially completed instruction "${instruction}".\nSucceeded: ${succeeded}\nFailed: ${failed}`;
    }

    const firstError = results.find((r) => !r.success)?.error || "Operation rejected by Canva.";
    return `Failed to execute: "${instruction}". Reason: ${firstError}`;
  }
}
