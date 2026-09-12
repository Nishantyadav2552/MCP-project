import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header/Header';
import { ChatPanel } from './components/Chat/ChatPanel';
import { CanvasPreview } from './components/Canvas/CanvasPreview';
import { DesignInspector } from './components/Inspector/DesignInspector';
import { CanvasSimulator, INITIAL_DESIGN_CONTEXT } from './services/canvasSimulator';
import { checkBackendHealth, sendChatMessage } from './services/api';
import { ChatMessage, DesignContext, Plan, PlanExecutionResult } from './types';

export const App: React.FC = () => {
  const simulator = useMemo(() => new CanvasSimulator(INITIAL_DESIGN_CONTEXT), []);
  const [designContext, setDesignContext] = useState<DesignContext>(simulator.getContext());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [backendStatus, setBackendStatus] = useState<'healthy' | 'offline' | 'checking'>('checking');
  const [activePlan, setActivePlan] = useState<Plan | undefined>(undefined);
  const [activeExecution, setActiveExecution] = useState<PlanExecutionResult | undefined>(undefined);

  // Subscribe to simulator updates
  useEffect(() => {
    const unsubscribe = simulator.subscribe((newCtx) => {
      setDesignContext({ ...newCtx });
    });
    return () => unsubscribe();
  }, [simulator]);

  // Check Backend Health on mount and periodically
  useEffect(() => {
    const verifyHealth = async () => {
      const health = await checkBackendHealth();
      setBackendStatus(health.status === 'healthy' ? 'healthy' : 'offline');
    };
    verifyHealth();
    const interval = setInterval(verifyHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (userPrompt: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        message: userPrompt,
        conversation_id: conversationId || undefined,
        design_context: designContext,
        auto_execute: true,
      });

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      setActivePlan(response.plan);
      setActiveExecution(response.execution);

      // Synchronize canvas if backend returned updated design context
      if (response.updated_design_context) {
        simulator.setContext(response.updated_design_context);
      }

      const assistantMsg: ChatMessage = {
        id: `msg_ast_${Date.now()}`,
        role: 'assistant',
        content: response.message,
        plan: response.plan,
        execution: response.execution,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Agent chat error:', err);
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to communicate with agent backend'}. Please ensure FastAPI is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    setActivePlan(undefined);
    setActiveExecution(undefined);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0c10] text-slate-100 overflow-hidden font-sans">
      {/* Top Application Header */}
      <Header
        backendStatus={backendStatus}
        onResetCanvas={() => simulator.resetToDefault()}
        onClearCanvas={() => simulator.clearCanvas()}
        activeElementsCount={designContext.elements.length}
      />

      {/* 3-Column Layout: Chat Panel (Left), Canvas View (Center), Inspector (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Natural Language Agent Chat */}
        <div className="w-[380px] shrink-0 h-full">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onClearHistory={handleClearHistory}
            activePlan={activePlan}
            activeExecution={activeExecution}
          />
        </div>

        {/* Center Column: Interactive Canva Canvas Preview */}
        <CanvasPreview
          designContext={designContext}
          onSelectElement={(id) => simulator.selectElement(id)}
          onDeleteElement={(id) => simulator.deleteElement(id)}
          onUpdatePosition={(id, x, y) => simulator.updateElementPosition(id, x, y)}
        />

        {/* Right Column: Layer Hierarchy & Properties Inspector */}
        <DesignInspector
          designContext={designContext}
          onSelectElement={(id) => simulator.selectElement(id)}
          onDeleteElement={(id) => simulator.deleteElement(id)}
          onUpdateText={(id, text) => simulator.updateElementText(id, text)}
          onUpdateTextStyle={(id, style) => simulator.updateElementTextStyle(id, style)}
          onUpdateShapeStyle={(id, style) => simulator.updateElementShapeStyle(id, style)}
          onSetBackground={(bg) => simulator.setBackground(bg)}
        />
      </div>
    </div>
  );
};
