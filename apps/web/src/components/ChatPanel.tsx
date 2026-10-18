import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, Loader2, ShieldAlert } from "lucide-react";
import { ChatMessage, ClarificationOption } from "../types.js";

interface ChatPanelProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  onSendMessage: (text: string, confirmed?: boolean) => void;
  onSelectClarificationOption: (option: ClarificationOption) => void;
}

const SUGGESTED_PROMPTS = [
  "Make the main heading blue and move it to the top of the page.",
  "Increase the font size of the title to 36.",
  "Change the background to a light beige.",
  "Align the subtitle with the heading.",
  "Make the heading blue", // tests ambiguity
  "Delete the button", // tests confirmation
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isProcessing,
  onSendMessage,
  onSelectClarificationOption,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    onSendMessage(inputText);
    setInputText("");
  };

  return (
    <div className="w-[420px] h-full border-l border-slate-800 bg-[#0B0F19] flex flex-col z-20 shadow-2xl">
      {/* Chat Header */}
      <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Cursor Assistant</h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
          Agentic Mode
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            {/* Sender Label */}
            <span className="text-[10px] font-mono text-slate-500 mb-1 px-1">
              {msg.sender === "user" ? "You" : "Canva Cursor"}
            </span>

            {/* User Message Bubble */}
            {msg.sender === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-cyan-600 to-blue-600 px-3.5 py-2 text-xs text-white shadow-md">
                {msg.text}
              </div>
            ) : (
              /* Agent Message Card */
              <div className="max-w-[95%] rounded-2xl rounded-tl-sm glass-card p-3.5 space-y-3 text-xs text-slate-200 shadow-xl border-slate-700/60">
                {/* Status Header Badge */}
                {msg.report && (
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5">
                      {msg.report.status === "completed" && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completed</span>
                        </span>
                      )}
                      {msg.report.status === "need_clarification" && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                          <HelpCircle className="w-3 h-3" />
                          <span>Needs Clarification</span>
                        </span>
                      )}
                      {msg.report.status === "awaiting_confirmation" && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Confirmation Required</span>
                        </span>
                      )}
                      {msg.report.status === "failed" && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                          <AlertCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {msg.report.durationMs}ms
                    </span>
                  </div>
                )}

                {/* Explanation text */}
                <div className="whitespace-pre-line text-[12px] leading-relaxed text-slate-300">
                  {msg.report?.explanation || msg.text}
                </div>

                {/* Clarification Options Modal/Picker */}
                {msg.report?.clarification && (
                  <div className="pt-2 space-y-2 border-t border-slate-800/80">
                    <span className="text-[11px] font-semibold text-amber-300 block">
                      Select intended element:
                    </span>
                    <div className="space-y-1.5">
                      {msg.report.clarification.options.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => onSelectClarificationOption(opt)}
                          className="w-full text-left p-2 rounded-lg bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/50 transition-all flex items-center justify-between group"
                        >
                          <div>
                            <span className="font-medium text-slate-200 block text-xs group-hover:text-amber-300">
                              {opt.label}
                            </span>
                            {opt.description && (
                              <span className="text-[10px] font-mono text-slate-500 block">
                                {opt.description}
                              </span>
                            )}
                          </div>
                          <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirmation Action for Destructive Changes */}
                {msg.report?.status === "awaiting_confirmation" && (
                  <div className="pt-2 flex items-center gap-2 border-t border-slate-800/80">
                    <button
                      onClick={() => onSendMessage(msg.report?.instruction || "", true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors shadow-lg shadow-rose-900/40"
                    >
                      Confirm Deletion
                    </button>
                    <button
                      onClick={() => onSendMessage("Cancel")}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Operation Diffs Cards */}
                {msg.report?.results && msg.report.results.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                      Verified Operations ({msg.report.results.length})
                    </span>
                    {msg.report.results.map((r, i) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-start justify-between font-mono text-[11px]"
                      >
                        <div className="space-y-0.5">
                          <span className="text-cyan-400 font-semibold">{r.operation.type}</span>
                          <span className="text-slate-500 block text-[10px] truncate max-w-[240px]">
                            {r.targetElementId || "page"}
                          </span>
                        </div>
                        {r.verified && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 bg-emerald-950/40 px-1 rounded border border-emerald-800/50">
                            ✓ verified
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-mono text-slate-500 mb-1 px-1">Canva Cursor</span>
            <div className="glass-card px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-xs text-slate-300 flex items-center gap-2 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Planning and executing with Canva precision...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Carousel */}
      <div className="p-2 border-t border-slate-800/60 bg-slate-950/40">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 block mb-1.5">
          Suggested Edits
        </span>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {SUGGESTED_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(prompt)}
              disabled={isProcessing}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors shrink-0 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/80">
        <div className="relative flex items-center">
          <input
            id="chat-instruction-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isProcessing}
            placeholder="Instruction: e.g. Make heading blue..."
            className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs text-slate-100 placeholder:text-slate-500 transition-colors disabled:opacity-50"
          />
          <button
            id="btn-send-instruction"
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="absolute right-1.5 p-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white disabled:opacity-30 transition-all shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
