/**
 * MessageBubble.tsx
 *
 * Renders a single message in the chat panel.
 * Uses verified @canva/app-ui-kit v5 APIs — no invalid tone or prop values.
 */

import { Text, Badge } from "@canva/app-ui-kit";

export interface Message {
  id: string;
  role: "user" | "assistant" | "error";
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

  const bgColor = isUser
    ? "#e8f0fe"
    : isError
    ? "#fce8e6"
    : "#ffffff";

  const borderColor = isError ? "#f28b82" : "#e0e0e0";

  return (
    <div
      style={{
        borderRadius: 8,
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        padding: "8px 10px",
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "92%",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {!isUser && (
        <Text size="xsmall" tone="tertiary">
          {isError ? "Error" : "Canva Cursor"}
        </Text>
      )}
      <Text
        size="small"
        tone={isError ? "critical" : "primary"}
      >
        {message.content}
      </Text>
      {message.operationSummary && (
        <OperationSummary summary={message.operationSummary} />
      )}
    </div>
  );
}

function OperationSummary({
  summary,
}: {
  summary: NonNullable<Message["operationSummary"]>;
}) {
  return (
    <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
      {summary.succeeded > 0 && (
        <Badge tone="positive" text={`✓ ${summary.succeeded} applied`} />
      )}
      {summary.failed > 0 && (
        <Badge tone="critical" text={`✗ ${summary.failed} failed`} />
      )}
      {summary.skipped > 0 && (
        <Badge tone="warn" text={`${summary.skipped} skipped`} />
      )}
    </div>
  );
}
