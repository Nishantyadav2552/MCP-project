import React from 'react';
import { Sparkles, Layers, RefreshCw, Cpu, Activity, ShieldCheck } from 'lucide-react';
import { isInsideCanvaApp } from '../../services/canvaSdk';

interface HeaderProps {
  backendStatus: 'healthy' | 'offline' | 'checking';
  onResetCanvas: () => void;
  onClearCanvas: () => void;
  activeElementsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  backendStatus,
  onResetCanvas,
  onClearCanvas,
  activeElementsCount,
}) => {
  const isCanva = isInsideCanvaApp();

  return (
    <header className="h-14 border-b border-slate-800 bg-[#0d1017] px-4 flex items-center justify-between z-20">
      {/* Brand & Mode */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-bold tracking-tight text-white">Canva AI Agent</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Cursor for Canva
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Natural-language agentic design engine</p>
        </div>
      </div>

      {/* Badges & Status */}
      <div className="flex items-center space-x-3">
        {/* Canva Environment Mode */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <ShieldCheck className={`w-3.5 h-3.5 ${isCanva ? 'text-emerald-400' : 'text-blue-400'}`} />
          <span className="text-[11px]">{isCanva ? 'Canva SDK Live' : 'Canva SDK Simulator'}</span>
        </div>

        {/* Backend API Health */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs">
          <Activity
            className={`w-3.5 h-3.5 ${
              backendStatus === 'healthy'
                ? 'text-emerald-400 animate-pulse'
                : backendStatus === 'checking'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          />
          <span className="text-[11px] text-slate-300">
            {backendStatus === 'healthy' ? 'API Connected' : backendStatus === 'checking' ? 'Connecting...' : 'API Offline'}
          </span>
        </div>

        {/* Canvas Elements counter */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-400">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px]">{activeElementsCount} Elements</span>
        </div>

        {/* Canvas controls */}
        <div className="flex items-center space-x-1 border-l border-slate-800 pl-2">
          <button
            onClick={onResetCanvas}
            title="Reset to demo canvas"
            className="px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center space-x-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="text-[11px]">Reset</span>
          </button>
          <button
            onClick={onClearCanvas}
            title="Clear all elements"
            className="px-2.5 py-1 rounded hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs transition-colors"
          >
            <span className="text-[11px]">Clear</span>
          </button>
        </div>
      </div>
    </header>
  );
};
