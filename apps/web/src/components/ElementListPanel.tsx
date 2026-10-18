import React from "react";
import { GraphNodeJSON } from "../types.js";
import { Tag, Move, Palette, Type, Lock } from "lucide-react";

interface ElementListPanelProps {
  nodes: GraphNodeJSON[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onQuickAction: (actionText: string) => void;
}

export const ElementListPanel: React.FC<ElementListPanelProps> = ({
  nodes,
  selectedElementId,
  onSelectElement,
  onQuickAction,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          Elements on Current Page ({nodes.length})
        </span>
        <span className="text-[10px] text-cyan-400 font-mono">Grounded IDs</span>
      </div>

      {nodes.map((node) => {
        const isSelected = node.id === selectedElementId;

        return (
          <div
            key={node.id}
            onClick={() => onSelectElement(isSelected ? null : node.id)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              isSelected
                ? "bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/10"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />
                <span>{node.role}</span>
              </span>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                <span>{node.type}</span>
                {node.locked && <Lock className="w-3 h-3 text-rose-400" />}
              </div>
            </div>

            {node.text && (
              <p className="text-xs font-medium text-slate-200 truncate mb-1">
                "{node.text}"
              </p>
            )}

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
              <span>pos: ({node.geometry.top}, {node.geometry.left})</span>
              <span>{node.geometry.width}×{node.geometry.height}px</span>
              {node.formatting?.fontSize && (
                <span className="text-cyan-400 font-semibold">{node.formatting.fontSize}pt</span>
              )}
            </div>

            {/* Quick action triggers when element is active */}
            {isSelected && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAction(`Make ${node.role} blue`);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Palette className="w-2.5 h-2.5" />
                  <span>Color Blue</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAction(`Move ${node.role} to the top of the page`);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Move className="w-2.5 h-2.5" />
                  <span>Move to Top</span>
                </button>

                {node.type === "text" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAction(`Increase font size of ${node.role} to 36`);
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <Type className="w-2.5 h-2.5" />
                    <span>36pt</span>
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
