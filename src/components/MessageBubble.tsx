/**
 * MessageBubble.tsx
 *
 * Renders a single message in the chat panel.
 */

import React from "react";
import { Box, Text, Badge } from "@canva/app-ui-kit";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "error";
  content: string;
  timestamp: number;
  operationSummary?: {
    succeeded: number;
    failed: number;
    skipped: number;
    total: number;
  };
}

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isError = message.role === "error";
  const isSystem = message.role === "system";

  return (
    <Box
      padding="1u"
      style={{
        borderRadius: 8,
        backgroundColor: isUser
          ? "#e8f0fe"
          : isError
          ? "#fdecea"
          : isSystem
          ? "#f5f5f5"
          : "#ffffff",
        border: isError ? "1px solid #f28b82" : "1px solid #e0e0e0",
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "90%",
      }}
    >
      {!isSystem && !isUser && (
        <Text size="xsmall" tone="tertiary" style={{ marginBottom: 4 }}>
          {isError ? "Error" : "Canva Cursor"}
        </Text>
      )}
      <Text
        size="small"
        tone={isError ? "critical" : isSystem ? "secondary" : "primary"}
      >
        {message.content}
      </Text>
      {message.operationSummary && <OperationSummaryBadges summary={message.operationSummary} />}
    </Box>
  );
}

function OperationSummaryBadges({
  summary,
}: {
  summary: NonNullable<Message["operationSummary"]>;
}) {
  return (
    <Box style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
      {summary.succeeded > 0 && (
        <Badge tone="positive">✓ {summary.succeeded} applied</Badge>
      )}
      {summary.failed > 0 && (
        <Badge tone="critical">✗ {summary.failed} failed</Badge>
      )}
      {summary.skipped > 0 && (
        <Badge tone="warn">{summary.skipped} skipped</Badge>
      )}
    </Box>
  );
}
