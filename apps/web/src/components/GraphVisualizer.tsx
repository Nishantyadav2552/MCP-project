import React, { useState } from "react";
import { GraphNodeJSON, GraphEdgeJSON } from "../types.js";
import { Network, Tag, ArrowRight, ShieldCheck, Hash } from "lucide-react";

interface GraphVisualizerProps {
  nodes: GraphNodeJSON[];
  edges: GraphEdgeJSON[];
  stateHash: string;
  onSelectNode: (id: string) => void;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  nodes,
  edges,
  stateHash,
  onSelectNode,
}) => {
  const [filterType, setFilterType] = useState<string>("ALL");

  const filteredEdges = filterType === "ALL" ? edges : edges.filter((e) => e.type === filterType);

  const edgeTypes = Array.from(new Set(edges.map((e) => e.type)));

  return (
    <div className="flex-1 h-full bg-[#070A12] flex flex-col p-6 overflow-hidden">
      {/* Graph Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800/80 flex items-center justify-center">
            <Network className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Design Knowledge Graph
              <span className="text-xs font-mono font-normal text-slate-400">
                ({nodes.length} nodes, {edges.length} edges)
              </span>
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
              <span className="flex items-center gap-1 text-cyan-400">
                <Hash className="w-3 h-3" />
                <span>Hash: {stateHash}</span>
              </span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Reconciled</span>
              </span>
            </div>
          </div>
        </div>

        {/* Edge Type Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
              filterType === "ALL"
                ? "bg-purple-900/60 text-purple-200 border border-purple-700"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            All Edges ({edges.length})
          </button>
          {edgeTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                filterType === t
                  ? "bg-purple-900/60 text-purple-200 border border-purple-700"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Graph Grid */}
      <div className="flex-1 grid grid-cols-2 gap-6 mt-6 overflow-hidden">
        {/* Nodes Column */}
        <div className="flex flex-col overflow-hidden glass-panel rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block font-mono">
            Graph Nodes (Elements)
          </span>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {nodes.map((n) => (
              <div
                key={n.id}
                onClick={() => onSelectNode(n.id)}
                className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-all hover:bg-slate-800/60"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-950 text-purple-300 border border-purple-800">
                    {n.role}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    type: <strong className="text-slate-300">{n.type}</strong>
                  </span>
                </div>

                {n.text && (
                  <p className="text-xs text-slate-200 font-medium truncate mb-1">
                    "{n.text}"
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>pos: ({n.geometry.top}, {n.geometry.left})</span>
                  <span>size: {n.geometry.width}×{n.geometry.height}</span>
                  {n.formatting?.fontSize && (
                    <span className="text-cyan-400">{n.formatting.fontSize}pt</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Edges Column */}
        <div className="flex flex-col overflow-hidden glass-panel rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block font-mono">
            Relational & Spatial Edges ({filteredEdges.length})
          </span>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredEdges.map((e) => (
              <div
                key={e.id}
                className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {e.type}
                  </span>
                  <span className="text-[10px] text-slate-500">{e.provenance}</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <span className="truncate max-w-[140px] text-purple-300">{e.source}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="truncate max-w-[140px] text-cyan-300">{e.target}</span>
                </div>

                {e.metadata && Object.keys(e.metadata).length > 0 && (
                  <div className="text-[10px] text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-900 truncate">
                    meta: {JSON.stringify(e.metadata)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
