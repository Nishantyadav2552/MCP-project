import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, RefreshCw, AlertCircle, Bot, User, Trash2 } from 'lucide-react';
import { ChatMessage, Plan, PlanExecutionResult } from '../../types';
import { PlanViewer } from '../Plan/PlanViewer';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClearHistory: () => void;
  activePlan?: Plan;
  activeExecution?: PlanExecutionResult;
}

const QUICK_PROMPTS = [
  'Create a modern Instagram post for a coffee shop with heading "Fresh Coffee Every Morning"',
  'Make the heading larger and move it to the center',
  'Add a CTA button saying "Visit Us Today"',
  'Add a 50% OFF discount badge in the corner',
  'Change the background to a warm espresso gradient',
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onClearHistory,
  activePlan,
  activeExecution,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1017] border-r border-slate-800">
      {/* Panel Top Title */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Agent Workspace
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClearHistory}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center px-4 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">What would you like to design?</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              Give instructions in natural language. The agent will plan and execute operations inside Canva.
            </p>

            {/* Quick Prompts List */}
            <div className="w-full space-y-2 text-left">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                Suggested Actions
              </div>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(prompt)}
                  className="w-full p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all text-left flex items-start space-x-2 group"
                >
                  <span className="text-indigo-400 group-hover:text-indigo-300">✦</span>
                  <span className="flex-1 leading-snug">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-[92%] ${
                    msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-indigo-400 border border-slate-700'
                    }`}
                  >
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Render Plan & Tasks if attached */}
                    {msg.plan && (
                      <PlanViewer
                        plan={msg.plan}
                        execution={msg.execution}
                        isExecuting={isLoading}
                      />
                    )}
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 mt-1 px-8">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Active Loading Indicator */}
            {isLoading && (
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>Planning design operations & executing Canva SDK tools...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick Prompt Pill Carousel (when messages exist) */}
      {messages.length > 0 && (
        <div className="px-4 py-2 flex items-center space-x-2 overflow-x-auto no-scrollbar border-t border-slate-800/60 bg-slate-950/40">
          {QUICK_PROMPTS.slice(1).map((prompt, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => onSendMessage(prompt)}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div className="p-4 border-t border-slate-800 bg-[#0b0e14]">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your design instruction... (e.g. 'Make heading larger and centered')"
            disabled={isLoading}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 pr-12 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 bottom-3 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all shadow-md"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 px-1">
          <span>Press Enter to send, Shift+Enter for newline</span>
          <span>Agent architecture: Planner → Executor → Tools</span>
        </div>
      </div>
    </div>
  );
};
