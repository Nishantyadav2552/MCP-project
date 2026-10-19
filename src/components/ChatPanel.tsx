/**
 * ChatPanel.tsx
 *
 * The main Canva Cursor chat interface, rendered inside the Canva editor panel.
 * Uses only verified @canva/app-ui-kit v5 component APIs.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Button,
  Rows,
  Text,
  Title,
  Alert,
  MultilineInput,
} from "@canva/app-ui-kit";
import type {
  AgentRequest,
  ExecutionResult,
  OperationResult,
  OperationPlan,
} from "../shared/types";
import { buildCurrentPageSnapshot } from "../canva/snapshot-builder";
import { executePlan } from "../canva/design-editor";
import { verifyResults } from "../canva/verifier";
import { requestPlan, reportResults } from "../services/agent-client";
import { MessageBubble, type Message } from "./MessageBubble";

type AppPhase =
  | "idle"
  | "reading_design"
  | "planning"
  | "executing"
  | "reporting";

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
  const [sessionId, setSessionId] = useState(
    () => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [lastPlanId, setLastPlanId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleClear = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I'm Canva Cursor. Tell me what you'd like to change in your design.",
        timestamp: Date.now(),
      },
    ]);
    setSessionId(`session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setLastPlanId(undefined);
    setError(null);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = useCallback((msg: Omit<Message, "id" | "timestamp">) => {
    setMessages((prev) => [
      ...prev,
      {
        ...msg,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const handleSubmit = useCallback(async () => {
    const instruction = input.trim();
    if (!instruction || phase !== "idle") return;

    setInput("");
    setError(null);
    addMessage({ role: "user", content: instruction });

    try {
      // Step 1: Read current design
      setPhase("reading_design");

      const snapshot = await buildCurrentPageSnapshot();
      if (!snapshot) {
        throw new Error(
          "Could not read the current page. Make sure you have a design open."
        );
      }
      if (snapshot.pageType === "unsupported") {
        throw new Error(
          "This page type isn't supported. Canva Cursor works with standard design pages (not Docs or whiteboards)."
        );
      }
      if (snapshot.pageLocked) {
        throw new Error(
          "This page is locked. Unlock it in Canva before making changes."
        );
      }

      // Step 2: Send to backend for planning
      setPhase("planning");
      const request: AgentRequest = {
        sessionId,
        instruction,
        snapshot,
        priorPlanId: lastPlanId,
      };

      const agentResponse = await requestPlan(request);

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
      plan.snapshotElementCount = snapshot.elements.length;
      setLastPlanId(plan.planId);

      // Step 3: Execute inside Canva
      setPhase("executing");

      const operationResults: OperationResult[] = await executePlan(plan);
      const verifiedResults = await verifyResults(plan, operationResults);

      // Step 4: Report results to backend, refresh graph
      setPhase("reporting");
      const updatedSnapshot = await buildCurrentPageSnapshot();
      if (!updatedSnapshot) {
        throw new Error("Could not read design after applying changes.");
      }

      const executionResult: ExecutionResult = {
        sessionId,
        planId: plan.planId,
        operationResults: verifiedResults,
        updatedSnapshot,
        executedAt: Date.now(),
      };

      const { message: finalMessage } = await reportResults(executionResult);

      const succeeded = verifiedResults.filter(
        (r) => r.status === "succeeded" || r.status === "succeeded_unverified"
      ).length;
      const failed = verifiedResults.filter((r) => r.status === "failed").length;
      const skipped = verifiedResults.filter((r) => r.status === "skipped").length;

      addMessage({
        role: "assistant",
        content: finalMessage,
        operationSummary: {
          succeeded,
          failed,
          skipped,
          total: verifiedResults.length,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addMessage({ role: "error", content: msg });
    } finally {
      setPhase("idle");
    }
  }, [input, phase, sessionId, lastPlanId, addMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const isLoading = phase !== "idle";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 12, gap: 8, boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Title size="small">Canva Cursor</Title>
          <Text size="small" tone="tertiary">
            {isLoading ? phaseLabel(phase) + "…" : "Ready — tell me what to change"}
          </Text>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={handleClear}
          disabled={isLoading}
        >
          Clear
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <Alert tone="critical" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minHeight: 200,
        }}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div style={{ padding: "4px 8px" }}>
            <Text size="small" tone="secondary">{phaseLabel(phase)}…</Text>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <Rows spacing="1u">
        <Text size="small" tone="secondary">
          What would you like to change?
        </Text>
        <MultilineInput
          value={input}
          placeholder={'e.g. "Make the heading blue" or "Move the logo to the bottom right"'}
          disabled={isLoading}
          onKeyDown={handleKeyDown}
          onChange={(value) => setInput(value)}
          minRows={2}
          maxRows={5}
          autoGrow
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
    </div>
  );
}

function phaseLabel(phase: AppPhase): string {
  switch (phase) {
    case "reading_design": return "Reading design";
    case "planning": return "Planning changes";
    case "executing": return "Applying changes";
    case "reporting": return "Verifying";
    default: return "Working";
  }
}
