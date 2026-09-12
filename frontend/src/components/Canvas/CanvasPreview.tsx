import React, { useState, useRef } from 'react';
import { DesignContext, CanvasElement } from '../../types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Move,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CanvasPreviewProps {
  designContext: DesignContext;
  onSelectElement: (id: string | null) => void;
  onDeleteElement: (id: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  designContext,
  onSelectElement,
  onDeleteElement,
  onUpdatePosition,
}) => {
  const [zoom, setZoom] = useState<number>(0.65);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasWidth = designContext.canvasWidth || 1080;
  const canvasHeight = designContext.canvasHeight || 1080;
  const selectedId = designContext.selectedElementIds?.[0] || null;

  const handleMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation();
    onSelectElement(element.id);
    setDraggingId(element.id);

    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const canvasRect = e.currentTarget.getBoundingClientRect();
    const newX = (e.clientX - canvasRect.left) / zoom - dragOffset.current.x;
    const newY = (e.clientY - canvasRect.top) / zoom - dragOffset.current.y;
    onUpdatePosition(draggingId, Math.max(0, Math.min(canvasWidth - 50, newX)), Math.max(0, Math.min(canvasHeight - 50, newY)));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: designContext.background.color || '#FFFFFF',
    backgroundImage: designContext.background.gradient || undefined,
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-[#0a0c10] relative overflow-hidden select-none"
      onClick={() => onSelectElement(null)}
    >
      {/* Top Toolbar */}
      <div className="h-10 border-b border-slate-800/80 bg-[#0d1017]/80 backdrop-blur px-4 flex items-center justify-between text-xs text-slate-400 z-10">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-300">
            {designContext.designType || 'Canva Design'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {canvasWidth} × {canvasHeight}px
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom((prev) => Math.max(0.3, prev - 0.1));
            }}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono w-10 text-center text-slate-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom((prev) => Math.min(1.2, prev + 0.1));
            }}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(0.65);
            }}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white ml-1"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 relative">
        <div
          className="relative shadow-2xl transition-transform duration-75 rounded-sm overflow-hidden"
          style={{
            width: canvasWidth * zoom,
            height: canvasHeight * zoom,
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Scaled Canvas Container */}
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${zoom})`,
              ...backgroundStyle,
            }}
          >
            {/* Render Canvas Elements */}
            {designContext.elements.map((el) => {
              const isSelected = selectedId === el.id;

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleMouseDown(e, el)}
                  className={`absolute cursor-move transition-shadow ${
                    isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black/50' : 'hover:ring-1 hover:ring-indigo-400/50'
                  }`}
                  style={{
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width}px`,
                    height: `${el.height}px`,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    zIndex: el.zIndex || 1,
                  }}
                >
                  {/* Selected Element Quick Action Controls */}
                  {isSelected && (
                    <div className="absolute -top-7 right-0 flex items-center space-x-1 bg-slate-900 border border-indigo-500/80 rounded px-1.5 py-0.5 shadow-lg text-[10px] text-white z-50">
                      <span className="font-mono text-indigo-300">{el.title || el.type}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteElement(el.id);
                        }}
                        className="p-0.5 hover:text-rose-400"
                        title="Delete Element"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* 1. TEXT ELEMENT */}
                  {el.type === 'text' && (
                    <div
                      className="w-full h-full flex items-center"
                      style={{
                        fontSize: `${el.textStyle?.fontSize || 24}px`,
                        fontFamily: el.textStyle?.fontFamily || 'Inter, sans-serif',
                        fontWeight: el.textStyle?.fontWeight || 'normal',
                        fontStyle: el.textStyle?.fontStyle || 'normal',
                        color: el.textStyle?.color || '#111827',
                        textAlign: el.textStyle?.textAlign || 'center',
                        justifyContent:
                          el.textStyle?.textAlign === 'start'
                            ? 'flex-start'
                            : el.textStyle?.textAlign === 'end'
                            ? 'flex-end'
                            : 'center',
                      }}
                    >
                      <span className="w-full leading-tight select-none">
                        {el.text || 'Sample Text'}
                      </span>
                    </div>
                  )}

                  {/* 2. SHAPE ELEMENT */}
                  {el.type === 'shape' && (
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundColor: el.shapeStyle?.fillColor || '#4F46E5',
                        borderColor: el.shapeStyle?.strokeColor || undefined,
                        borderWidth: el.shapeStyle?.strokeWidth ? `${el.shapeStyle.strokeWidth}px` : undefined,
                        borderStyle: el.shapeStyle?.strokeWidth ? 'solid' : undefined,
                        borderRadius:
                          el.shapeType === 'circle'
                            ? '50%'
                            : el.shapeType === 'pill'
                            ? '999px'
                            : `${el.shapeStyle?.cornerRadius || 0}px`,
                        opacity: el.shapeStyle?.opacity ?? 1,
                      }}
                    />
                  )}

                  {/* 3. IMAGE ELEMENT */}
                  {el.type === 'image' && (
                    <div className="w-full h-full rounded-md overflow-hidden bg-slate-800 shadow-md">
                      {el.imageUrl ? (
                        <img
                          src={el.imageUrl}
                          alt={el.altText || 'Canva visual'}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-800/80 p-2 text-center text-xs">
                          <Sparkles className="w-6 h-6 text-indigo-400 mb-1" />
                          <span>{el.altText || 'Graphic Element'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
