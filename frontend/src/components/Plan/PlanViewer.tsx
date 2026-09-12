import React, { useState } from 'react';
import { Plan, PlanExecutionResult, TaskItem } from '../../types';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Code2,
  Terminal,
  Cpu,
  Layers,
} from 'lucide-react';

interface PlanViewerProps {
  plan?: Plan;
  execution?: PlanExecutionResult;
  isExecuting?: boolean;
}

export const PlanViewer: React.FC<PlanViewerProps> = ({
  plan,
  execution,
  isExecuting = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'tree' | 'json' | 'tools'>('tree');
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<string | null>(null);

  if (!plan) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'in_progress':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse';
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="border border-slate-800 rounded-lg bg-[#11141d] overflow-hidden my-3 shadow-lg">
      {/* Plan Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800/80">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-left group focus:outline-none"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
          )}
          <div className="flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200">Execution Plan</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              {plan.tasks.length} tasks
            </span>
          </div>
        </button>

        {/* View Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px]">
          <button
            onClick={() => setActiveTab('tree')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'tree' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Steps
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'tools' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tools
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'json' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-3">
          {/* Goal & Reasoning summary */}
          <div className="mb-3 px-3 py-2 rounded bg-slate-900/60 border border-slate-800/60">
            <div className="text-xs font-medium text-slate-200">{plan.goal}</div>
            {plan.reasoning && (
              <div className="text-[11px] text-slate-400 mt-0.5 font-normal leading-relaxed">
                {plan.reasoning}
              </div>
            )}
          </div>

          {/* Tree View */}
          {activeTab === 'tree' && (
            <div className="space-y-2">
              {plan.tasks.map((task: TaskItem, index: number) => {
                const isSelected = selectedTaskDetails === task.id;
                return (
                  <div
                    key={task.id || index}
                    className="border border-slate-800/80 rounded-md bg-slate-950/60 hover:border-slate-700 transition-all overflow-hidden"
                  >
                    <div
                      onClick={() => setSelectedTaskDetails(isSelected ? null : task.id)}
                      className="px-3 py-2 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {getStatusIcon(task.status)}
                        <span className="text-xs text-slate-200 truncate">{task.description}</span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {task.action}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${getStatusBadgeClass(
                            task.status
                          )}`}
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>

                    {/* Collapsible Details */}
                    {isSelected && (
                      <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 text-[11px] font-mono space-y-1">
                        <div className="text-slate-400">Parameters:</div>
                        <pre className="p-2 rounded bg-black/50 text-indigo-300 overflow-x-auto text-[10px]">
                          {JSON.stringify(task.parameters, null, 2)}
                        </pre>
                        {task.result && (
                          <>
                            <div className="text-emerald-400 mt-2">Tool Output:</div>
                            <pre className="p-2 rounded bg-black/50 text-emerald-300 overflow-x-auto text-[10px]">
                              {JSON.stringify(task.result, null, 2)}
                            </pre>
                          </>
                        )}
                        {task.error && (
                          <div className="p-2 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300 mt-1 text-[10px]">
                            {task.error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tools View */}
          {activeTab === 'tools' && (
            <div className="space-y-1.5">
              {execution?.records && execution.records.length > 0 ? (
                execution.records.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-mono text-slate-200">{rec.tool_name}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                      <span>{rec.execution_time_ms.toFixed(1)}ms</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          rec.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 p-3 text-center">
                  Tool executions will appear here during runtime.
                </div>
              )}
            </div>
          )}

          {/* JSON View */}
          {activeTab === 'json' && (
            <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 max-h-60 overflow-y-auto">
              {JSON.stringify(plan, null, 2)}
            </pre>
          )}

          {/* Execution Status Footer */}
          {execution && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{execution.final_message}</span>
              <span
                className={`font-semibold ${
                  execution.success ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {execution.tasks_completed}/{execution.tasks_total} Completed
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
