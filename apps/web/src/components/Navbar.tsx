import React from "react";
import { Sparkles, Undo2, RotateCcw, Activity, Layers, Network, Clock } from "lucide-react";

interface NavbarProps {
  connected: boolean;
  dimensions?: { width: number; height: number };
  activeTab: "canvas" | "graph" | "history";
  onTabChange: (tab: "canvas" | "graph" | "history") => void;
  onRollback: () => void;
  onReset: () => void;
  isRollingBack?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  connected,
  dimensions,
  activeTab,
  onTabChange,
  onRollback,
  onReset,
  isRollingBack,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-4 z-30 select-none">
      {/* Brand & Badges */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00C4CC] to-[#7D2AE8] flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              Canva Cursor
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                v0.1 MVP
              </span>
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Status indicator */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-slate-300 font-medium text-[11px]">
              {connected ? "Bridge Live" : "Offline"}
            </span>
          </div>

          {dimensions && (
            <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
              <span>{dimensions.width}</span>
              <span>×</span>
              <span>{dimensions.height}px</span>
            </div>
          )}
        </div>
      </div>

      {/* Center Tabs */}
      <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
        <button
          id="tab-canvas-btn"
          onClick={() => onTabChange("canvas")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            activeTab === "canvas"
              ? "bg-[#00C4CC]/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Canvas View</span>
        </button>

        <button
          id="tab-graph-btn"
          onClick={() => onTabChange("graph")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            activeTab === "graph"
              ? "bg-[#7D2AE8]/20 text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Knowledge Graph</span>
        </button>

        <button
          id="tab-history-btn"
          onClick={() => onTabChange("history")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            activeTab === "history"
              ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Audit Log</span>
        </button>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2">
        <button
          id="btn-undo-rollback"
          onClick={onRollback}
          disabled={isRollingBack}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          title="Rollback last operation"
        >
          <Undo2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Rollback</span>
        </button>

        <button
          id="btn-reset-canvas"
          onClick={onReset}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-300 hover:bg-rose-950/30 hover:border-rose-900 transition-colors"
          title="Reset canvas to default"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
