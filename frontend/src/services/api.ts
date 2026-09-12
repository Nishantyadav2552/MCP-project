/**
 * API Service for communicating with FastAPI Agent Backend.
 */
import { ChatRequest, ChatResponse, Plan, ToolDefinition, DesignContext, PlanExecutionResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function checkBackendHealth(): Promise<{ status: string; service: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend health check failed:', err);
    return { status: 'offline', service: 'canva-ai-design-agent' };
  }
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Network error occurred' }));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }

  return await res.json();
}

export async function requestPlanOnly(
  message: string,
  designContext: DesignContext,
  conversationId?: string
): Promise<Plan> {
  const res = await fetch(`${API_BASE_URL}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      design_context: designContext,
      conversation_id: conversationId,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Planning error' }));
    throw new Error(errorData.detail || 'Failed to create plan');
  }

  return await res.json();
}

export async function requestExecuteOnly(
  plan: Plan,
  designContext: DesignContext,
  conversationId: string
): Promise<{ execution: PlanExecutionResult; updated_design_context?: DesignContext }> {
  const res = await fetch(`${API_BASE_URL}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan,
      design_context: designContext,
      conversation_id: conversationId,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Execution error' }));
    throw new Error(errorData.detail || 'Failed to execute plan');
  }

  return await res.json();
}

export async function fetchRegisteredTools(): Promise<ToolDefinition[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tools`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching tool registry:', err);
    return [];
  }
}
