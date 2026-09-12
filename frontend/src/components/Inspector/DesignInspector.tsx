import React, { useState } from 'react';
import { DesignContext, CanvasElement } from '../../types';
import {
  Layers,
  Sliders,
  Type,
  Square,
  Image as ImageIcon,
  Trash2,
  Terminal,
  Activity,
  Palette,
} from 'lucide-react';

interface DesignInspectorProps {
  designContext: DesignContext;
  onSelectElement: (id: string | null) => void;
  onDeleteElement: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdateTextStyle: (id: string, style: any) => void;
  onUpdateShapeStyle: (id: string, style: any) => void;
  onSetBackground: (bg: any) => void;
}

export const DesignInspector: React.FC<DesignInspectorProps> = ({
  designContext,
  onSelectElement,
  onDeleteElement,
  onUpdateText,
  onUpdateTextStyle,
  onUpdateShapeStyle,
  onSetBackground,
}) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'properties' | 'canvas'>('layers');
  const selectedId = designContext.selectedElementIds?.[0] || null;
  const selectedElement = designContext.elements.find((el) => el.id === selectedId);

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Type className="w-3.5 h-3.5 text-sky-400" />;
      case 'shape':
        return <Square className="w-3.5 h-3.5 text-amber-400" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="w-80 h-full bg-[#0d1017] border-l border-slate-800 flex flex-col text-xs text-slate-300 select-none">
      {/* Tab Switcher */}
      <div className="h-10 border-b border-slate-800 flex items-center px-2 space-x-1 bg-[#0b0e14]">
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-1.5 rounded flex items-center justify-center space-x-1.5 transition-colors ${
            activeTab === 'layers'
              ? 'bg-slate-800 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="text-[11px]">Layers ({designContext.elements.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-1.5 rounded flex items-center justify-center space-x-1.5 transition-colors ${
            activeTab === 'properties'
              ? 'bg-slate-800 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="text-[11px]">Inspector</span>
        </button>
        <button
          onClick={() => setActiveTab('canvas')}
          className={`flex-1 py-1.5 rounded flex items-center justify-center space-x-1.5 transition-colors ${
            activeTab === 'canvas'
              ? 'bg-slate-800 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span className="text-[11px]">Canvas</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* 1. LAYERS TAB */}
        {activeTab === 'layers' && (
          <div className="space-y-1.5">
            {designContext.elements.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No elements on canvas.
                <div className="text-[10px] text-slate-600 mt-1">
                  Ask the AI agent to generate layout & elements.
                </div>
              </div>
            ) : (
              [...designContext.elements].reverse().map((el) => {
                const isSelected = selectedId === el.id;
                return (
                  <div
                    key={el.id}
                    onClick={() => onSelectElement(el.id)}
                    className={`px-2.5 py-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500/60 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      {getElementIcon(el.type)}
                      <div className="truncate">
                        <div className="text-[11px] font-medium truncate">
                          {el.title || el.text || `${el.type} element`}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          {el.id} • {el.width}×{el.height}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteElement(el.id);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 2. PROPERTIES INSPECTOR TAB */}
        {activeTab === 'properties' && (
          <div>
            {selectedElement ? (
              <div className="space-y-4">
                {/* Element Header */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getElementIcon(selectedElement.type)}
                    <span className="font-semibold text-slate-200">
                      {selectedElement.title || selectedElement.type}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {selectedElement.id}
                  </span>
                </div>

                {/* Geometry */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Transform
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">X:</span>
                      <span className="font-mono text-slate-200">{selectedElement.x}px</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">Y:</span>
                      <span className="font-mono text-slate-200">{selectedElement.y}px</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">W:</span>
                      <span className="font-mono text-slate-200">{selectedElement.width}px</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">H:</span>
                      <span className="font-mono text-slate-200">{selectedElement.height}px</span>
                    </div>
                  </div>
                </div>

                {/* Text Properties */}
                {selectedElement.type === 'text' && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Typography
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Text Content</label>
                      <textarea
                        rows={2}
                        value={selectedElement.text || ''}
                        onChange={(e) => onUpdateText(selectedElement.id, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Font Size</label>
                        <input
                          type="number"
                          value={selectedElement.textStyle?.fontSize || 24}
                          onChange={(e) =>
                            onUpdateTextStyle(selectedElement.id, {
                              fontSize: Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Color</label>
                        <input
                          type="color"
                          value={selectedElement.textStyle?.color || '#FFFFFF'}
                          onChange={(e) =>
                            onUpdateTextStyle(selectedElement.id, { color: e.target.value })
                          }
                          className="w-full h-8 bg-slate-900 border border-slate-800 rounded cursor-pointer p-0.5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Shape Properties */}
                {selectedElement.type === 'shape' && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Shape Styling
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Fill Color</label>
                        <input
                          type="color"
                          value={selectedElement.shapeStyle?.fillColor || '#4F46E5'}
                          onChange={(e) =>
                            onUpdateShapeStyle(selectedElement.id, { fillColor: e.target.value })
                          }
                          className="w-full h-8 bg-slate-900 border border-slate-800 rounded cursor-pointer p-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Corner Radius</label>
                        <input
                          type="number"
                          value={selectedElement.shapeStyle?.cornerRadius || 0}
                          onChange={(e) =>
                            onUpdateShapeStyle(selectedElement.id, {
                              cornerRadius: Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                Select an element on canvas to inspect and modify properties.
              </div>
            )}
          </div>
        )}

        {/* 3. CANVAS TAB */}
        {activeTab === 'canvas' && (
          <div className="space-y-4">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Canvas Background
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Solid Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={designContext.background.color || '#FFFFFF'}
                  onChange={(e) =>
                    onSetBackground({ color: e.target.value, gradient: undefined })
                  }
                  className="w-10 h-8 bg-slate-900 border border-slate-800 rounded cursor-pointer p-0.5"
                />
                <span className="font-mono text-xs text-slate-300">
                  {designContext.background.color}
                </span>
              </div>
            </div>

            {/* Quick Palettes */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Preset Palettes</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { name: 'Espresso Warm', bg: '#FFF8E7', grad: 'linear-gradient(135deg, #FFF8E7 0%, #F5E6CC 100%)' },
                  { name: 'Dark Slate', bg: '#0F172A', grad: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' },
                  { name: 'Modern Amber', bg: '#FEF3C7', grad: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' },
                  { name: 'Cyber Neon', bg: '#090D16', grad: 'linear-gradient(135deg, #090D16 0%, #171E31 100%)' },
                ].map((palette, i) => (
                  <button
                    key={i}
                    onClick={() => onSetBackground({ color: palette.bg, gradient: palette.grad })}
                    className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-left text-[11px] flex items-center space-x-2"
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                      style={{ background: palette.grad }}
                    />
                    <span className="text-slate-300 truncate">{palette.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
