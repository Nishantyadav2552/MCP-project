/**
 * app.tsx — Canva Cursor entry point
 *
 * This is the root component rendered inside the Canva editor panel.
 * It must remain lightweight; the actual UI is in ChatPanel.
 */

import { ChatPanel } from "./components/ChatPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";

export function App() {
  return (
    <ErrorBoundary>
      <ChatPanel />
    </ErrorBoundary>
  );
}
