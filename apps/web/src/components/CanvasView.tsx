import React, { useState } from "react";
import { GraphNodeJSON } from "../types.js";
import { Lock, Tag, Move, Palette, Type } from "lucide-react";

interface CanvasViewProps {
  pageDimensions: { width: number; height: number };
  backgroundColor?: string;
  nodes: GraphNodeJSON[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onQuickAction: (actionText: string) => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  pageDimensions,
  backgroundColor = "#FFFFFF",
  nodes,
  selectedElementId,
  onSelectElement,
  onQuickAction,
}) => {
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  // Calculate dynamic scale to fit viewport neatly
  const targetWidth = 1920;
  const targetHeight = 1080;
  const scale = 0.52; // Scale factor for preview canvas

  const selectedNode = nodes.find((n) => n.id === selectedElementId);

  return (
    <div className="relative flex-1 h-full bg-[#070A12] flex items-center justify-center p-6 overflow-hidden">
      {/* Background canvas workspace grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#FFFFFF 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Main Canvas Frame */}
      <div
        id="canva-design-canvas-frame"
        className="relative shadow-2xl rounded-sm transition-all duration-300 border border-slate-700/60 overflow-hidden"
        style={{
          width: `${targetWidth * scale}px`,
          height: `${targetHeight * scale}px`,
          backgroundColor: backgroundColor,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectElement(null);
          }
        }}
      >
        {/* Render elements in z-index order */}
        {nodes.map((node) => {
          const isSelected = node.id === selectedElementId;
          const isHovered = node.id === hoveredElementId;
          const geom = node.geometry;

          // Scaled coordinates
          const style: React.CSSProperties = {
            position: "absolute",
            top: `${geom.top * scale}px`,
            left: `${geom.left * scale}px`,
            width: `${geom.width * scale}px`,
            height: `${geom.height * scale}px`,
            opacity: geom.transparency,
            transform: `rotate(${geom.rotation}deg)`,
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          };

          return (
            <div
              key={node.id}
              id={`canvas-elem-${node.id}`}
              style={style}
              onMouseEnter={() => setHoveredElementId(node.id)}
              onMouseLeave={() => setHoveredElementId(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement(node.id);
              }}
              className={`cursor-pointer select-none group relative ${
                isSelected
                  ? "ring-2 ring-[#00C4CC] ring-offset-2 ring-offset-slate-900 z-20 shadow-lg shadow-cyan-500/20"
                  : isHovered
                  ? "ring-1 ring-cyan-400/70 z-10"
                  : ""
              }`}
            >
              {/* Element Type: Text */}
              {node.type === "text" && (
                <div
                  className="w-full h-full flex flex-col justify-start"
                  style={{
                    color: node.formatting?.color || "#000000",
                    fontSize: `${(node.formatting?.fontSize || 16) * scale}px`,
                    fontFamily: node.formatting?.fontFamily || "Inter",
                    fontWeight: node.formatting?.fontWeight || "normal",
                    fontStyle: node.formatting?.fontStyle || "normal",
                    textAlign: (node.formatting?.textAlign as React.CSSProperties["textAlign"]) || "start",
                    lineHeight: 1.15,
                  }}
                >
                  {node.text}
                </div>
              )}

              {/* Element Type: Rect / Shape */}
              {(node.type === "rect" || node.type === "shape") && (
                <div
                  className="w-full h-full rounded shadow-sm transition-colors"
                  style={{
                    backgroundColor: node.fillColor || "#3B82F6",
                  }}
                />
              )}

              {/* Hover Badge */}
              {(isHovered || isSelected) && (
                <div className="absolute -top-6 left-0 bg-slate-900/90 text-cyan-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-cyan-800 shadow-md flex items-center gap-1 pointer-events-none whitespace-nowrap z-30">
                  <Tag className="w-2.5 h-2.5" />
                  <span>{node.role}</span>
                  {node.locked && <Lock className="w-2.5 h-2.5 text-rose-400 ml-0.5" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Selected Element Inspector Sidebar */}
      {selectedNode && (
        <aside
          id="element-inspector-panel"
          className="absolute right-4 top-4 bottom-4 w-72 glass-panel rounded-xl p-4 flex flex-col shadow-2xl z-20 animate-in fade-in slide-in-from-right-4 duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <h3 className="font-semibold text-xs tracking-tight text-white uppercase">Element Inspector</h3>
            </div>
            <button
              onClick={() => onSelectElement(null)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-3 flex-1 overflow-y-auto pr-1 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block uppercase font-mono">Handle ID</span>
              <span className="font-mono text-[11px] text-cyan-300 break-all select-all">{selectedNode.id}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Role</span>
                <span className="inline-block px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-medium text-[11px] border border-purple-800">
                  {selectedNode.role}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Type</span>
                <span className="capitalize text-slate-200">{selectedNode.type}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-slate-500 text-[10px] block uppercase font-mono mb-1">Geometry (px)</span>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-slate-300">
                <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">T: {selectedNode.geometry.top}</div>
                <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">L: {selectedNode.geometry.left}</div>
                <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">W: {selectedNode.geometry.width}</div>
                <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">H: {selectedNode.geometry.height}</div>
              </div>
            </div>

            {selectedNode.type === "text" && (
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-slate-500 text-[10px] block uppercase font-mono mb-1">Typography</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Size:</span>
                    <span className="font-mono">{selectedNode.formatting?.fontSize || 16}pt</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Color:</span>
                    <div className="flex items-center gap-1 font-mono">
                      <span
                        className="w-3 h-3 rounded-full border border-slate-600 inline-block"
                        style={{ backgroundColor: selectedNode.formatting?.color || "#000000" }}
                      />
                      <span>{selectedNode.formatting?.color || "#000000"}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Font:</span>
                    <span>{selectedNode.formatting?.fontFamily || "Inter"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-800/80">
              <span className="text-slate-500 text-[10px] block uppercase font-mono mb-2">Cursor Quick Edits</span>
              <div className="space-y-1.5">
                <button
                  onClick={() => onQuickAction(`Make ${selectedNode.role} blue`)}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Palette className="w-3 h-3 text-cyan-400" />
                  <span>Make {selectedNode.role} blue</span>
                </button>

                <button
                  onClick={() => onQuickAction(`Move ${selectedNode.role} to the top of the page`)}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Move className="w-3 h-3 text-amber-400" />
                  <span>Move to top of page</span>
                </button>

                {selectedNode.type === "text" && (
                  <button
                    onClick={() => onQuickAction(`Increase font size of ${selectedNode.role} to 36`)}
                    className="w-full text-left px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Type className="w-3 h-3 text-purple-400" />
                    <span>Set font size to 36</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
