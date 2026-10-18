/**
 * agent/orchestrator.ts
 *
 * The main agent orchestrator.
 * Manages per-session state, coordinates the plan-execute-verify cycle,
 * and maintains the conversation history and design knowledge graph.
 */

import type {
  AgentRequest,
  AgentResponse,
  ExecutionResult,
  OperationResult,
} from "../../src/shared/types";
import { buildGraph, refreshGraph } from "../graph/builder";
import type { DesignGraph } from "../graph/models";
import { generatePlan } from "./planner";

// ─── Session state ────────────────────────────────────────────────────────────

interface AgentSession {
  sessionId: string;
  graph: DesignGraph | null;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  lastPlanId: string | undefined;
  createdAt: number;
  lastActivityAt: number;
}

// In-memory session store. For production, replace with Redis or a DB.
const sessions = new Map<string, AgentSession>();

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

function getOrCreateSession(sessionId: string): AgentSession {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      graph: null,
      conversationHistory: [],
      lastPlanId: undefined,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    sessions.set(sessionId, session);
  }
  session.lastActivityAt = Date.now();
  return session;
}

/** Periodically remove stale sessions to prevent unbounded memory growth. */
function pruneOldSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivityAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}
setInterval(pruneOldSessions, 15 * 60 * 1000); // every 15 minutes

// ─── Plan request handler ─────────────────────────────────────────────────────

/**
 * Process a plan request from the frontend.
 * Builds/refreshes the design graph and generates an operation plan.
 */
export async function handlePlanRequest(request: AgentRequest): Promise<AgentResponse> {
  const session = getOrCreateSession(request.sessionId);

  // Rebuild or refresh the graph from the snapshot
  // We rebuild every time because the snapshot reflects the current live design
  session.graph = buildGraph(request.snapshot);

  // Generate the plan
  const plannerResult = await generatePlan(
    request.instruction,
    session.graph,
    session.conversationHistory,
    request.sessionId
  );

  // Update conversation history
  session.conversationHistory.push({
    role: "user",
    content: request.instruction,
  });

  switch (plannerResult.type) {
    case "plan": {
      const plan = plannerResult.plan!;
      session.lastPlanId = plan.planId;
      session.conversationHistory.push({
        role: "assistant",
        content: plannerResult.explanation ?? plan.description,
      });
      return {
        sessionId: request.sessionId,
        plan,
        explanation: plannerResult.explanation ?? plan.description,
        requiresClarification: false,
      };
    }

    case "clarification": {
      const question = plannerResult.clarificationQuestion ?? "Could you clarify your request?";
      session.conversationHistory.push({
        role: "assistant",
        content: question,
      });
      return {
        sessionId: request.sessionId,
        plan: null,
        explanation: question,
        clarificationNeeded: question,
        requiresClarification: true,
      };
    }

    case "impossible": {
      const explanation = plannerResult.explanation ?? "That operation is not currently supported.";
      session.conversationHistory.push({
        role: "assistant",
        content: explanation,
      });
      return {
        sessionId: request.sessionId,
        plan: null,
        explanation,
        requiresClarification: false,
      };
    }

    case "error":
    default: {
      const msg = plannerResult.error ?? "An unexpected error occurred. Please try again.";
      return {
        sessionId: request.sessionId,
        plan: null,
        explanation: msg,
        requiresClarification: false,
      };
    }
  }
}

// ─── Execution result handler ─────────────────────────────────────────────────

/**
 * Process execution results from the frontend.
 * Refreshes the knowledge graph and produces a user-facing summary.
 */
export async function handleExecutionResult(
  result: ExecutionResult
): Promise<{ message: string }> {
  const session = sessions.get(result.sessionId);
  if (!session) {
    // Session expired between plan and execution — just return a summary
    return { message: buildSummaryMessage(result.operationResults) };
  }

  // Refresh graph with post-execution snapshot
  session.graph = refreshGraph(result.updatedSnapshot);

  const message = buildSummaryMessage(result.operationResults);

  // Update conversation history with the outcome
  session.conversationHistory.push({
    role: "assistant",
    content: message,
  });

  return { message };
}

// ─── Summary builder ──────────────────────────────────────────────────────────

function buildSummaryMessage(results: OperationResult[]): string {
  const total = results.length;
  const succeeded = results.filter(
    (r) => r.status === "succeeded" || r.status === "succeeded_unverified"
  );
  const failed = results.filter((r) => r.status === "failed");
  const skipped = results.filter((r) => r.status === "skipped");

  if (succeeded.length === total) {
    return succeeded.length === 1
      ? "Done — the change has been applied."
      : `Done — all ${succeeded.length} changes have been applied.`;
  }

  if (failed.length === total) {
    const reasons = failed
      .map((r) => r.errorMessage)
      .filter(Boolean)
      .slice(0, 2)
      .join("; ");
    return `None of the changes could be applied. ${reasons ? `Reason: ${reasons}` : "Please check that the elements are not locked."}`;
  }

  const parts: string[] = [];
  if (succeeded.length > 0) {
    parts.push(`${succeeded.length} of ${total} changes applied`);
  }
  if (failed.length > 0) {
    const reasons = failed
      .map((r) => r.errorMessage)
      .filter(Boolean)
      .slice(0, 2)
      .join("; ");
    parts.push(`${failed.length} failed${reasons ? ` (${reasons})` : ""}`);
  }
  if (skipped.length > 0) {
    parts.push(`${skipped.length} skipped due to earlier failures`);
  }

  return parts.join(". ") + ".";
}
