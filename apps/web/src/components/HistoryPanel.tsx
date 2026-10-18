import React from "react";
import { Clock, CheckCircle2, XCircle, Undo2, ArrowRight } from "lucide-react";

interface HistoryEntry {
  operationId: string;
  timestamp: number;
  operation: {
    type: string;
    targetElementId?: string;
    [key: string]: unknown;
  };
  targetElementId?: string;
  success: boolean;
  verified: boolean;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  error?: string;
}

interface HistoryPanelProps {
  history: HistoryEntry[];
  onRollback: () => void;
  isRollingBack?: boolean;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onRollback,
  isRollingBack,
}) => {
  return (
    <div className="flex-1 h-full bg-[#070A12] flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Execution Audit Log & Verification History</h2>
            <p className="text-xs text-slate-400">Complete immutable record of all Canva canvas mutations</p>
          </div>
        </div>

        <button
          onClick={onRollback}
          disabled={isRollingBack || history.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors disabled:opacity-40"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Rollback Most Recent Edit</span>
        </button>
      </div>

      {/* History Items List */}
      <div className="flex-1 overflow-y-auto mt-6 space-y-3 pr-2">
        {history.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
            <Clock className="w-8 h-8 mb-2 opacity-40" />
            <span>No operations executed yet in this session.</span>
          </div>
        ) : (
          history
            .slice()
            .reverse()
            .map((entry, index) => (
              <div
                key={entry.operationId || index}
                className="p-4 rounded-xl glass-panel space-y-2 border-slate-800/80 font-mono text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-cyan-400 text-xs">
                      {entry.operation.type}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      on <code className="text-slate-300">{entry.targetElementId || "page"}</code>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    {entry.success ? (
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Success</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                        <XCircle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Diff View */}
                {entry.previousValue && entry.newValue && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-[11px]">
                    <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase mb-1">Previous State</span>
                      <pre className="text-rose-300 whitespace-pre-wrap">
                        {JSON.stringify(entry.previousValue, null, 2)}
                      </pre>
                    </div>

                    <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase mb-1">New State (Verified)</span>
                      <pre className="text-emerald-300 whitespace-pre-wrap">
                        {JSON.stringify(entry.newValue, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {entry.error && (
                  <div className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-[11px]">
                    Error: {entry.error}
                  </div>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
};
