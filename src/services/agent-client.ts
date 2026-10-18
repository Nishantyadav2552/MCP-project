/**
 * agent-client.ts
 *
 * HTTP client for communicating with the backend agent server.
 * Runs in the browser inside the Canva app iframe.
 */

import type { AgentRequest, AgentResponse, ExecutionResult } from "../shared/types";

// BACKEND_HOST is injected at bundle time by @canva/app-scripts' DefinePlugin.
// Its value is taken from CANVA_BACKEND_HOST in .env (default: http://localhost:3001).
// The fallback keeps the TypeScript compiler happy in test environments.
const API_BASE = typeof BACKEND_HOST !== "undefined" ? BACKEND_HOST : "http://localhost:3001";

/**
 * Sends a user instruction + design snapshot to the backend agent.
 * Returns a plan (or a clarification question).
 */
export async function requestPlan(request: AgentRequest): Promise<AgentResponse> {
  const response = await fetch(`${API_BASE}/agent/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Agent request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<AgentResponse>;
}

/**
 * Sends execution results back to the backend for graph synchronization
 * and to receive the final user-facing explanation.
 */
export async function reportResults(result: ExecutionResult): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/agent/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Result report failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<{ message: string }>;
}
