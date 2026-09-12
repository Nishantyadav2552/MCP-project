# Canva AI Design Agent ("Cursor for Canva")

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TypeScript-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Canva SDK](https://img.shields.io/badge/Canva-Apps%20SDK%20v2-00C4CC?style=flat)](https://www.canva.com/developers/)
[![Tests](https://img.shields.io/badge/Tests-19%2F19%20Passing-brightgreen?style=flat&logo=pytest)](https://pytest.org/)

An agentic AI pair-designing application designed as **"Cursor for Canva"**. Users give natural language instructions, and an autonomous AI agent system understands the design intent, creates structured execution plans, validates schemas, and manipulates Canva design elements through official Canva SDK capabilities and MCP tools.

---

## Key Features

- 🧠 **Planner & Execution Agent Architecture**: Clear separation of concerns between intent analysis/task decomposition (Planner Agent) and sequential tool execution with error recovery (Execution Agent).
- 🛠️ **MCP-Compatible Tool Registry**: Standardized JSON Schema contracts for Canva design tools (`create_text`, `update_text`, `style_text`, `add_shape`, `add_image`, `move_element`, `resize_element`, `delete_element`, `set_background`, `get_design_context`, `get_selected_element`).
- ⚡ **Dual-Mode Canva Integration**:
  - **Canva Native Mode**: Seamlessly executes operations via `@canva/design` and `@canva/asset` when embedded in the Canva Apps Developer Portal.
  - **Interactive Canvas Simulator**: High-fidelity live visual canvas with element drag-and-drop, bounding boxes, text styling, and layer inspector for instant standalone development and testing without an active Canva developer session.
- 🔄 **Multi-Turn Context & Semantic Mapping**: Understands follow-up instructions (e.g. *"Make the heading larger and move it to the center"*) by preserving element IDs, design layers, and past plans.
- 🔌 **Configurable LLM Provider**: Provider abstraction supporting OpenAI, Groq, and custom OpenAI-compatible endpoints (Ollama, LMStudio, vLLM, Gemini) configured via standard environment variables.
- 🛡️ **Defensive Engineering & Safety**: Tool allowlist enforcement, strictly no arbitrary code execution, and explicit detection/explanation of unsupported capabilities.

---

## High-Level Architecture

```text
                    ┌──────────────────────────────┐
                    │             User             │
                    │   Natural Language Prompt    │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      Canva App Frontend      │
                    │  (React + TypeScript + Vite) │
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

## Project Structure

```text
canva-ai-agent/
│
├── frontend/                     # React + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header/           # App header with SDK & API health status
│   │   │   ├── Chat/             # Natural language chat & quick prompt pills
│   │   │   ├── Plan/             # Expandable Plan progress tree & tool inspect
│   │   │   ├── Canvas/           # Interactive live design canvas preview
│   │   │   └── Inspector/        # Layers list, property inspector & tool logs
│   │   ├── services/
│   │   │   ├── api.ts            # Backend FastAPI client
│   │   │   ├── canvaSdk.ts       # Official Canva Apps SDK adapter
│   │   │   └── canvasSimulator.ts # High-fidelity Canva canvas state engine
│   │   ├── types/                # TypeScript interfaces
│   │   ├── App.tsx               # Root application component
│   │   └── index.css             # Theme and design tokens
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                      # Python FastAPI Backend
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py         # Endpoints: /api/chat, /api/plan, /api/execute, /api/tools, /api/mcp
│   │   ├── agents/
│   │   │   ├── planner.py        # Dedicated Planner Agent (Intent -> Plan)
│   │   │   ├── executor.py       # Dedicated Execution Agent (Task -> Tools)
│   │   │   ├── orchestrator.py   # Full pipeline coordinator
│   │   │   └── state.py          # Session & design state manager
│   │   ├── llm/
│   │   │   ├── base.py           # Base provider interface
│   │   │   ├── openai_provider.py # OpenAI integration (GPT-4o)
│   │   │   ├── groq_provider.py  # Groq integration (Llama-3.3)
│   │   │   ├── compatible_provider.py # Universal OpenAI-compatible client
│   │   │   └── factory.py        # Dynamic provider resolver
│   │   ├── tools/
│   │   │   ├── base.py           # BaseTool class definition
│   │   │   ├── canva_tools.py    # Concrete Canva SDK tool implementations
│   │   │   └── registry.py       # Tool registry & allowlist enforcement
│   │   ├── mcp/
│   │   │   ├── adapter.py        # MCP JSON-RPC protocol converter
│   │   │   └── server.py         # MCP JSON-RPC 2.0 endpoint handler
│   │   ├── models/               # Pydantic models (Plan, Design, Chat, Tool)
│   │   ├── services/             # Tracing (Langfuse) & prompt loaders
│   │   ├── prompts/              # External system prompt templates
│   │   ├── config.py             # Pydantic Settings
│   │   └── main.py               # FastAPI entrypoint & CORS
│   ├── tests/                    # 19 Unit & Integration Pytest suites
│   ├── requirements.txt
│   └── .env.example
│
├── docs/
│   ├── architecture.md           # Detailed architecture document
│   ├── setup.md                  # Developer & Canva setup guide
│   └── agent-flow.md             # In-depth lifecycle breakdown
│
├── docker-compose.yml            # Multi-service container orchestrator
├── pytest.ini                    # Pytest configuration
├── .gitignore
└── README.md
```

---

## Quickstart

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 3. Run Automated Tests

```bash
python -m pytest -v
```

---

## Example Agent Scenarios

### Scenario 1: Initial Creation
> **User**: *"Create an Instagram post for a coffee shop with heading 'Fresh Coffee Every Morning', a warm background, and a CTA 'Visit Us Today'."*
- **Planner Agent**: Analyzes intent and generates a structured 5-task plan.
- **Execution Agent**: Sets background color, adds styled heading, inserts coffee visual hero image, and adds styled CTA button with label.
- **Result**: Visual layout rendered in Canva in < 1 second.

### Scenario 2: Context-Aware Follow-Up
> **User**: *"Make the heading larger and move it to the center."*
- **Planner Agent**: References the existing `heading` element ID from session context.
- **Execution Agent**: Updates typography and moves the existing heading without duplicate creations.

### Scenario 3: Unsupported Capability Detection
> **User**: *"Sculpt a 3D animated mesh for my logo."*
- **Planner Agent**: Detects unsupported operation, explains the Canva SDK 2D limitation, and suggests supported alternatives (`add_shape`, `add_image`).

---

## Docker Support

Run with Docker Compose:

```bash
docker-compose up --build
```

---

## Documentation Links

- [System Architecture](docs/architecture.md)
- [Setup & Canva Developer Guide](docs/setup.md)
- [Agent Lifecycle & Flow](docs/agent-flow.md)
