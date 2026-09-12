# System Architecture: Canva AI Design Agent ("Cursor for Canva")

## Overview

The **Canva AI Design Agent** is an end-to-end agentic application that brings "Cursor-like" natural language pair-programming and design manipulation into Canva. The system translates natural language instructions into structured, strongly-typed execution plans, maps tasks to Canva SDK capabilities, and performs operations with full error handling and multi-turn state preservation.

---

## High-Level Architectural Diagram

```text
                    ┌──────────────────────────────┐
                    │             User             │
                    │   Natural Language Prompt    │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      Canva App Frontend      │
                    │   (React + TypeScript + UI)  │
                    │   Chat + Plan Tree + Canvas  │
                    └──────────────┬───────────────┘
                                   │  HTTP / JSON-RPC
                                   ▼
                    ┌──────────────────────────────┐
                    │         FastAPI API          │
                    │    /api/chat, /api/plan,     │
                    │    /api/execute, /api/mcp    │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      Agent Orchestrator      │
                    │   State & Session Context    │
                    └──────────────┬───────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 │                                   │
                 ▼                                   ▼
      ┌─────────────────────┐             ┌─────────────────────┐
      │    Planner Agent    │             │   Execution Agent   │
      │ Intent Analysis &   │────────────►│ Task Validation &   │
      │ Task Decomposition  │  Validated  │ Sequential Tool     │
      │  (No Direct SDK)    │    Plan     │ Execution (Canva)   │
      └─────────────────────┘             └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │   MCP Tool Layer    │
                                          │  Canva Capabilities │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │ Official Canva SDK  │
                                          │ (@canva/design etc) │
                                          └─────────────────────┘
```

---

## Core Components

### 1. Planner Agent (`backend/app/agents/planner.py`)
- **Responsibility**: Analyzes user intent, checks the active canvas element tree, dimensions, and selection state, and decomposes requests into an ordered sequence of tasks.
- **Strict Isolation**: The Planner Agent **never executes Canva code or tool mutations directly**. It outputs a validated Pydantic `Plan` containing `TaskItem` objects.
- **Unsupported Capability Handling**: When a user requests capabilities beyond the Canva SDK (e.g. 3D generative meshes, arbitrary external code execution), the Planner sets `is_supported=false`, explains the reason, and suggests supported alternatives.

### 2. Execution Agent (`backend/app/agents/executor.py`)
- **Responsibility**: Receives the validated `Plan`, resolves task arguments and semantic placeholders (e.g., `"heading"`, `"cta"`, `"selected"`), verifies tools against the allowlist, and executes them sequentially.
- **Safety & Error Trapping**: Each task is executed in isolation with detailed timing, status tracking (`completed`, `failed`, `in_progress`), and input/output capture. Failures are reported cleanly without crashing the pipeline.

### 3. Tool System & MCP Layer (`backend/app/tools/`, `backend/app/mcp/`)
- **Contract**: Every tool implements `name`, `description`, `input_schema` (JSON Schema), and `execute()`.
- **Allowlist Enforcement**: The `ToolRegistry` enforces that only explicitly registered Canva tools can be invoked. Arbitrary code execution is strictly prohibited.
- **MCP Compatibility**: Standard MCP JSON-RPC 2.0 endpoint (`/api/mcp`) allows external agents and IDEs to discover and invoke Canva tools.

### 4. Conversation & Design State Manager (`backend/app/agents/state.py`)
- Maintains multi-turn conversation sessions.
- Builds semantic mappings (`heading` -> `el_heading_123`, `cta` -> `el_cta_456`) so follow-up commands like *"Make the heading larger and move it to the center"* resolve unambiguously.
- Formats trimmed conversation turns for prompt context windows.

### 5. LLM Provider Abstraction (`backend/app/llm/`)
- Abstract base class `BaseLLMProvider` with dynamic factory support for:
  - `OpenAIProvider` (GPT-4o, GPT-4o-mini)
  - `GroqProvider` (Llama-3.3-70b)
  - `CompatibleProvider` (Ollama, LMStudio, vLLM, Gemini OpenAI endpoints)
- Robust JSON extraction handling markdown fences and raw objects.

### 6. Canva SDK Integration & Dual-Mode Architecture (`frontend/src/services/`)
- **Canva Native Mode**: When running inside the Canva Developer App iframe, uses `@canva/design` (`addNativeElement`, `draftElement`, selection listener) and `@canva/asset` (`uploadAttachment`).
- **Interactive Simulator Mode**: When running standalone in local dev mode, activates an interactive canvas engine with full drag-and-drop, real-time styling, layer inspector, and SDK method parity.

---

## Security & Privacy
1. **No Hard-Coded Secrets**: All API keys and tokens are loaded through environment variables.
2. **Tool Sandboxing**: The agent cannot execute arbitrary Python, Node, shell commands, or network queries outside of registered Canva tools.
3. **CORS Isolation**: Configurable allowed origins (`FRONTEND_ORIGINS`) with strict origin validation in production.
4. **Data Minimization**: Prompts only receive relevant canvas layout metadata, never transmitting sensitive user information.
