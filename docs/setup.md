# Developer Setup & Configuration Guide

This guide details the prerequisites, environment setup, and running instructions for **Canva Cursor**.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher (Current environment: v24.19.0)
- **Package Manager**: npm v9+ (Current environment: 11.17.0)
- **Canva Developer Account**: Optional for local preview/development mode; required for publishing to Canva Apps directory.
- **LLM Provider API Key**: (Optional, system supports Gemini / OpenAI / Anthropic or built-in deterministic offline mock planner).

---

## 2. Monorepo Organization

The project uses an efficient npm workspaces monorepo:

```
d:/MCP project/
├── packages/
│   ├── shared/            # Common types, schemas, error codes
│   ├── knowledge-graph/   # Graph models, spatial engine, semantic classifier
│   ├── canva-adapter/     # Abstract adapter, SDK implementation, dev mock
│   ├── mcp-server/        # Official Model Context Protocol server
│   └── agent/             # Cursor planner, state machine, Zod validator
├── apps/
│   ├── bridge/            # WebSocket / HTTP RPC communication bridge
│   └── web/               # Canva App & Interactive Visual Editor / Chat UI
├── tests/
│   ├── unit/              # Independent unit tests for graph, tools, planner
│   └── integration/       # End-to-end integration test suites
└── docs/                  # Architecture, capabilities, and setup documentation
```

---

## 3. Configuration & Environment Variables

Copy `.env.example` to `.env`:

```env
# Server & Bridge Ports
PORT=3000
BRIDGE_PORT=3001
MCP_PORT=3002

# AI LLM Provider Configuration
GEMINI_API_KEY=your_gemini_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here

# Mode Settings
NODE_ENV=development
CANVA_APP_ENV=local_simulation # or 'canva_editor'
```

---

## 4. Running the Application

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Tests**:
   ```bash
   npm test
   ```

3. **Start Development Environment**:
   ```bash
   npm run dev
   ```
   This concurrently boots:
   - Canva Bridge Server (`http://localhost:3001`)
   - Custom MCP Server (`http://localhost:3002` or stdio)
   - Cursor Frontend & Canva App Studio (`http://localhost:5173`)
