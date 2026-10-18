/**
 * app.tsx — Canva Cursor entry point
 *
 * This is the root component rendered inside the Canva editor panel.
 * It must remain lightweight; the actual UI is in ChatPanel.
 */

import React from "react";
import { ChatPanel } from "./components/ChatPanel";

export function App() {
  return <ChatPanel />;
}
