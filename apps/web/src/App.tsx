import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Undo2,
  RotateCcw,
  MessageSquare,
  Network,
  Layers,
  Clock,
} from "lucide-react";
import { ChatPanel } from "./components/ChatPanel.js";
import { GraphVisualizer } from "./components/GraphVisualizer.js";
import { HistoryPanel } from "./components/HistoryPanel.js";
import { ElementListPanel } from "./components/ElementListPanel.js";
import { canvaRuntime } from "./services/canva-runtime.js";
import { DesignDataResponse, ChatMessage, ClarificationOption } from "./types.js";

export const App: React.FC = () => {
  const [isInCanva, setIsInCanva] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "graph" | "elements" | "history">("chat");

  const [designData, setDesignData] = useState<DesignDataResponse | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "agent",
      text: "👋 Welcome to **Canva Cursor**! I am your integrated Canva App assistant.\n\nType instructions like:\n• *\"Make the main heading blue\"*\n• *\"Move the heading to the top of the page\"*\n• *\"Increase the font size of the title to 36\"*\n• *\"Align the subtitle with the heading\"*\n• *\"Change the background to a light beige\"*\n\nI parse your design structure using a Design Knowledge Graph and execute verified edits through Canva's Design Editing API.",
      timestamp: Date.now(),
    },
  ]);

  // Load active Canva design state on mount
  useEffect(() => {
    setIsInCanva(canvaRuntime.isCanvaEnvironment);

    const loadCanvaDesign = async () => {
      try {
        const data = await canvaRuntime.getDesignData();
        setDesignData(data);
        setHistory(canvaRuntime.getHistory());
      } catch (err) {
        console.error("Error loading Canva design:", err);
      }
    };

    loadCanvaDesign();
  }, []);

  const handleSendMessage = async (text: string, confirmed = false) => {
    const userMsgId = `user_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text, timestamp: Date.now() },
    ]);
    setIsProcessing(true);

    try {
      const report = await canvaRuntime.executeInstruction(text, confirmed);

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

      // Refresh live Canva design data
      const freshData = await canvaRuntime.getDesignData();
      setDesignData(freshData);
      setHistory(canvaRuntime.getHistory());
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
      await canvaRuntime.rollback();
      const freshData = await canvaRuntime.getDesignData();
      setDesignData(freshData);
      setHistory(canvaRuntime.getHistory());

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
      const freshData = await canvaRuntime.reset();
      setDesignData(freshData);
      setHistory(canvaRuntime.getHistory());
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
    <div className="h-screen w-screen bg-[#0B0F19] text-slate-100 overflow-hidden flex flex-col font-sans select-none">
      {/* 
        CANVA APP DRAWER HEADER
        Compact layout optimized for Canva's in-editor side panel
      */}
      <header className="h-14 border-b border-slate-800/90 px-3.5 flex items-center justify-between bg-slate-950/80 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00C4CC] to-[#7D2AE8] flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs tracking-tight text-white">Canva Cursor</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Canva App
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isInCanva ? "Canva Editor Connected" : "Canva App Runtime"}</span>
            </div>
          </div>
        </div>

        {/* Quick Header Actions */}
        <div className="flex items-center space-x-1.5">
          <button
            id="btn-undo-rollback"
            onClick={handleRollback}
            disabled={isRollingBack}
            className="p-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 transition-colors disabled:opacity-40"
            title="Undo last edit"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-reset-canvas"
            onClick={handleReset}
            className="p-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400 transition-colors"
            title="Reset state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Segmented Control Bar */}
      <div className="px-3 pt-2.5 pb-2 bg-slate-950/40 border-b border-slate-800/60 shrink-0">
        <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium">
          <button
            id="app-tab-chat"
            onClick={() => setActiveTab("chat")}
            className={`py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
              activeTab === "chat"
                ? "bg-[#00C4CC]/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Chat</span>
          </button>

          <button
            id="app-tab-graph"
            onClick={() => setActiveTab("graph")}
            className={`py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
              activeTab === "graph"
                ? "bg-[#7D2AE8]/20 text-purple-300 border border-purple-500/30 font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-3 h-3" />
            <span>Graph</span>
          </button>

          <button
            id="app-tab-elements"
            onClick={() => setActiveTab("elements")}
            className={`py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
              activeTab === "elements"
                ? "bg-slate-800 text-slate-100 border border-slate-700 font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Layers</span>
          </button>

          <button
            id="app-tab-history"
            onClick={() => setActiveTab("history")}
            className={`py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
              activeTab === "history"
                ? "bg-slate-800 text-slate-100 border border-slate-700 font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Audit</span>
          </button>
        </div>
      </div>

      {/* Main Canva App Drawer Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "chat" && (
          <ChatPanel
            messages={messages}
            isProcessing={isProcessing}
            onSendMessage={handleSendMessage}
            onSelectClarificationOption={handleSelectClarificationOption}
          />
        )}

        {activeTab === "graph" && (
          <div className="flex-1 overflow-y-auto">
            <GraphVisualizer
              nodes={designData?.graph.nodes || []}
              edges={designData?.graph.edges || []}
              stateHash={designData?.graph.stateHash || "none"}
              onSelectNode={(id) => {
                setSelectedElementId(id);
                setActiveTab("elements");
              }}
            />
          </div>
        )}

        {activeTab === "elements" && (
          <ElementListPanel
            nodes={designData?.graph.nodes || []}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onQuickAction={handleSendMessage}
          />
        )}

        {activeTab === "history" && (
          <HistoryPanel
            history={history}
            onRollback={handleRollback}
            isRollingBack={isRollingBack}
          />
        )}
      </div>
    </div>
  );
};
