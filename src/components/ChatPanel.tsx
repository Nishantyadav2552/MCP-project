/**
 * ChatPanel.tsx
 *
 * The main Canva Cursor chat interface.
 * Rendered as the primary panel inside the Canva editor.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  FormField,
  MultilineInput,
  Rows,
  Text,
  Alert,
  LoadingIndicator,
  Badge,
} from "@canva/app-ui-kit";
import type {
  AgentRequest,
  AgentResponse,
  ExecutionResult,
  OperationResult,
  OperationPlan,
} from "../shared/types";
import { buildCurrentPageSnapshot } from "../canva/snapshot-builder";
import { executePlan } from "../canva/design-editor";
import { requestPlan, reportResults } from "../services/agent-client";
import { MessageBubble, type Message } from "./MessageBubble";

type AppPhase =
  | "idle"
  | "reading_design"
  | "planning"
  | "executing"
  | "reporting"
  | "done";

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm Canva Cursor. Tell me what you'd like to change in your design.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [lastPlanId, setLastPlanId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = useCallback((msg: Omit<Message, "id" | "timestamp">) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: Date.now() },
    ]);
  }, []);

  const handleSubmit = useCallback(async () => {
    const instruction = input.trim();
    if (!instruction || phase !== "idle") return;

    setInput("");
    setError(null);

    // Show user's message
    addMessage({ role: "user", content: instruction });

    try {
      // Step 1: Read current design
      setPhase("reading_design");
      addMessage({ role: "system", content: "Reading your design…" });

      const snapshot = await buildCurrentPageSnapshot();
      if (!snapshot) {
        throw new Error("Could not read the current page. Make sure you have a design open.");
      }
      if (snapshot.pageType === "unsupported") {
        throw new Error("This page type isn't supported. Canva Cursor works with standard design pages (not Docs or whiteboards).");
      }
      if (snapshot.pageLocked) {
        throw new Error("This page is locked. Unlock it in Canva before making changes.");
      }

      // Step 2: Send to backend agent for planning
      setPhase("planning");

      const request: AgentRequest = {
        sessionId,
        instruction,
        snapshot,
        priorPlanId: lastPlanId,
      };

      const agentResponse: AgentResponse = await requestPlan(request);

      // Handle clarification requests
      if (agentResponse.requiresClarification && agentResponse.clarificationNeeded) {
        addMessage({ role: "assistant", content: agentResponse.clarificationNeeded });
        setPhase("idle");
        return;
      }

      if (!agentResponse.plan) {
        addMessage({ role: "assistant", content: agentResponse.explanation });
        setPhase("idle");
        return;
      }

      const plan: OperationPlan = agentResponse.plan;
      setLastPlanId(plan.planId);

      addMessage({
        role: "system",
        content: `Plan ready: ${plan.description} (${plan.operations.length} operation${plan.operations.length !== 1 ? "s" : ""})`,
      });

      // Step 3: Execute plan inside Canva
      setPhase("executing");
      addMessage({ role: "system", content: "Applying changes to your design…" });

      const operationResults: OperationResult[] = await executePlan(plan);

      // Step 4: Read updated design, report results to backend
      setPhase("reporting");
      const updatedSnapshot = await buildCurrentPageSnapshot();
      if (!updatedSnapshot) {
        throw new Error("Could not read design after applying changes.");
      }

      const executionResult: ExecutionResult = {
        sessionId,
        planId: plan.planId,
        operationResults,
        updatedSnapshot,
        executedAt: Date.now(),
      };

      const { message: finalMessage } = await reportResults(executionResult);

      // Show outcome summary
      const succeeded = operationResults.filter((r) => r.status === "succeeded" || r.status === "succeeded_unverified").length;
      const failed = operationResults.filter((r) => r.status === "failed").length;
      const skipped = operationResults.filter((r) => r.status === "skipped").length;

      addMessage({
        role: "assistant",
        content: finalMessage,
        operationSummary: { succeeded, failed, skipped, total: operationResults.length },
      });

      setPhase("done");
      // Allow new instructions
      setTimeout(() => setPhase("idle"), 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addMessage({ role: "error", content: msg });
      setPhase("idle");
    }
  }, [input, phase, sessionId, lastPlanId, addMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const isLoading = phase !== "idle" && phase !== "done";

  return (
    <Rows spacing="2u">
      {/* Header */}
      <Box padding="1u">
        <Text variant="heading" size="medium">
          Canva Cursor
        </Text>
        <Text size="small" tone="tertiary">
          AI design editor · {phase === "idle" ? "Ready" : phaseLabel(phase)}
        </Text>
      </Box>

      {/* Error banner */}
      {error && (
        <Alert tone="critical" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Message list */}
      <Box
        padding="1u"
        style={{ minHeight: 300, maxHeight: 450, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <Box padding="1u" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LoadingIndicator size="small" />
            <Text size="small" tone="secondary">
              {phaseLabel(phase)}…
            </Text>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box padding="1u">
        <Rows spacing="1u">
          <FormField
            label="What would you like to change?"
            value={input}
            control={(props) => (
              <MultilineInput
                {...props}
                placeholder='e.g. "Make the main heading blue" or "Move the logo to the bottom right"'
                disabled={isLoading}
                onKeyDown={handleKeyDown}
                onChange={(value) => setInput(value)}
                minRows={2}
                maxRows={5}
              />
            )}
          />
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            loading={isLoading}
            stretch
          >
            {isLoading ? phaseLabel(phase) : "Send"}
          </Button>
        </Rows>
      </Box>
    </Rows>
  );
}

function phaseLabel(phase: AppPhase): string {
  switch (phase) {
    case "reading_design": return "Reading design";
    case "planning": return "Planning changes";
    case "executing": return "Applying changes";
    case "reporting": return "Verifying";
    case "done": return "Done";
    default: return "Working";
  }
}
