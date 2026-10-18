import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar.js";
import { CanvasView } from "./components/CanvasView.js";
import { ChatPanel } from "./components/ChatPanel.js";
import { GraphVisualizer } from "./components/GraphVisualizer.js";
import { HistoryPanel } from "./components/HistoryPanel.js";
import {
  fetchDesignData,
  sendAgentInstruction,
  rollbackLastOperation,
  resetDesign,
  fetchHistory,
} from "./services/api.js";
import { DesignDataResponse, ChatMessage, ClarificationOption } from "./types.js";

export const App: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<"canvas" | "graph" | "history">("canvas");
  const [designData, setDesignData] = useState<DesignDataResponse | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "agent",
      text: "👋 Welcome to **Canva Cursor**! I am your agentic AI design assistant. Give me instructions like *'Make the main heading blue'*, *'Move heading to the top'*, or *'Align the subtitle with the heading'*. I understand your design structure through a grounded Design Knowledge Graph and execute verified mutations via MCP tools.",
      timestamp: Date.now(),
    },
  ]);

  // Load initial design and connect WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;

    const loadData = async () => {
      try {
        const data = await fetchDesignData();
        setDesignData(data);
        setConnected(true);

        const hist = await fetchHistory();
        setHistory(hist.history || []);
      } catch (err) {
        console.warn("Bridge not currently reachable:", err);
        setConnected(false);
      }
    };

    loadData();

    // Connect WebSocket
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      ws = new WebSocket(`${protocol}//${host}/ws`);

      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onmessage = async (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "OPERATION_FINISHED" || msg.type === "DESIGN_UPDATED" || msg.type === "DESIGN_RESET") {
            const fresh = await fetchDesignData();
            setDesignData(fresh);
            const freshHist = await fetchHistory();
            setHistory(freshHist.history || []);
          }
        } catch {
          // ignore parsing error
        }
      };
    } catch {
      // WS fallback
    }

    return () => {
      ws?.close();
    };
  }, []);

  const handleSendMessage = async (text: string, confirmed = false) => {
    const userMsgId = `user_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text, timestamp: Date.now() },
    ]);
    setIsProcessing(true);

    try {
      const report = await sendAgentInstruction(text, confirmed);

      setMessages((prev) => [
        ...prev,
        {
          id: `agent_${Date.now()}`,
          sender: "agent",
          text: report.explanation,
          report,
          timestamp: Date.now(),
        },
      ]);

      // Re-fetch fresh design data
      const updated = await fetchDesignData();
      setDesignData(updated);

      const updatedHist = await fetchHistory();
      setHistory(updatedHist.history || []);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "agent",
          text: `⚠️ Execution failed: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectClarificationOption = (option: ClarificationOption) => {
    handleSendMessage(`Modify element "${option.label}" (${option.elementId})`);
  };

  const handleRollback = async () => {
    setIsRollingBack(true);
    try {
      await rollbackLastOperation();
      const updated = await fetchDesignData();
      setDesignData(updated);
      const updatedHist = await fetchHistory();
      setHistory(updatedHist.history || []);

      setMessages((prev) => [
        ...prev,
        {
          id: `rollback_${Date.now()}`,
          sender: "agent",
          text: "↺ Successfully rolled back the previous canvas edit to its prior verified state.",
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      alert(`Rollback failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleReset = async () => {
    try {
      const fresh = await resetDesign();
      setDesignData(fresh);
      const freshHist = await fetchHistory();
      setHistory(freshHist.history || []);
      setSelectedElementId(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `reset_${Date.now()}`,
          sender: "agent",
          text: "🔄 Canvas reset to initial template state.",
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      alert(`Reset failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0F19] text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation */}
      <Navbar
        connected={connected}
        dimensions={designData?.snapshot.page.dimensions}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRollback={handleRollback}
        onReset={handleReset}
        isRollingBack={isRollingBack}
      />

      {/* Main Workspace: Center Workspace + Right Chat Panel */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Center Tabbed Views */}
        {activeTab === "canvas" && (
          <CanvasView
            pageDimensions={designData?.snapshot.page.dimensions || { width: 1920, height: 1080 }}
            backgroundColor={designData?.snapshot.page.backgroundColor}
            nodes={designData?.graph.nodes || []}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onQuickAction={handleSendMessage}
          />
        )}

        {activeTab === "graph" && (
          <GraphVisualizer
            nodes={designData?.graph.nodes || []}
            edges={designData?.graph.edges || []}
            stateHash={designData?.graph.stateHash || "none"}
            onSelectNode={(id) => {
              setSelectedElementId(id);
              setActiveTab("canvas");
            }}
          />
        )}

        {activeTab === "history" && (
          <HistoryPanel
            history={history}
            onRollback={handleRollback}
            isRollingBack={isRollingBack}
          />
        )}

        {/* Right Cursor Chat Panel */}
        <ChatPanel
          messages={messages}
          isProcessing={isProcessing}
          onSendMessage={handleSendMessage}
          onSelectClarificationOption={handleSelectClarificationOption}
        />
      </div>
    </div>
  );
};
