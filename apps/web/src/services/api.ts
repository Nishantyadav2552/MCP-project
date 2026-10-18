import { DesignDataResponse, AgentExecutionReport } from "../types.js";

const BASE_URL = "";

export async function fetchDesignData(): Promise<DesignDataResponse> {
  const res = await fetch(`${BASE_URL}/api/design`);
  if (!res.ok) {
    throw new Error(`Failed to fetch design data: ${res.statusText}`);
  }
  return res.json();
}

export async function sendAgentInstruction(
  instruction: string,
  confirmed = false
): Promise<AgentExecutionReport> {
  const res = await fetch(`${BASE_URL}/api/agent/instruct`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction, confirmed }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${res.status}`);
  }
  return res.json();
}

export async function rollbackLastOperation(): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/api/rollback`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Rollback failed");
  }
  return res.json();
}

export async function resetDesign(): Promise<DesignDataResponse> {
  const res = await fetch(`${BASE_URL}/api/reset`, { method: "POST" });
  if (!res.ok) {
    throw new Error("Reset failed");
  }
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch(`${BASE_URL}/api/history`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}
