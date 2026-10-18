# Canva Cursor

An agentic AI design editor inside Canva. Give natural-language instructions to modify your designs, and the agent reads, plans, executes, and verifies changes — all without leaving the Canva editor.

## What it does

- Opens inside the Canva editor as a panel
- Reads your current design: elements, text, positions, styles
- Builds a design knowledge graph with semantic roles (heading, subtitle, CTA, etc.)
- Understands natural-language instructions like "make the heading blue" or "move the logo to the bottom right"
- Generates a validated operation plan
- Executes real Canva API operations
- Verifies and reports results

## Supported operations (MVP)

- Change text color, font size, font weight, font style, text alignment
- Change rect/shape fill colors
- Change page background color
- Move elements to absolute or relative positions
- Resize elements
- Change layer order
- Delete elements
- Replace text content
- Group/ungroup elements (Phase 3)

## Architecture

```
Canva App UI (React in Canva panel)
  ↓ HTTP (design snapshot + instruction)
Backend Agent (Node.js + Express)
  ↓
LLM (Gemini / Claude / GPT) → OperationPlan JSON
  ↓
Frontend executes plan via Canva Design Editing API
  ↓
Results reported back → graph refreshed → user message
```

See [docs/architecture.md](docs/architecture.md) for the full architecture document.

## Quick start

See [docs/setup.md](docs/setup.md) for the complete setup guide.

```bash
# 1. Install Canva CLI and log in
npm install -g @canva/cli@latest
canva login

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend && npm install && cd ..

# 4. Configure .env (add Canva app credentials + LLM API key)

# 5. Start the backend
cd backend && npm run dev

# 6. Start the frontend dev server
npm start

# 7. Connect in Developer Portal → App → Inside Canva → Development URL = http://localhost:8080
```

## Running tests

```bash
npm test
```

## Tech stack

- **Frontend**: React, TypeScript, `@canva/design`, `@canva/app-ui-kit`
- **Backend**: Node.js, TypeScript, Express, Zod
- **LLM**: Gemini (default), Anthropic Claude, or OpenAI — configurable via `.env`
- **Design graph**: TypeScript in-memory graph (no Neo4j required for MVP)

## Project structure

```
src/
  app.tsx                 ← Canva app entry point
  components/             ← Chat UI components
  canva/                  ← Canva API integration (snapshot, editor)
  services/               ← Backend HTTP client
  shared/types.ts         ← Shared types (frontend + backend)
backend/
  server.ts               ← Express API server
  agent/                  ← LLM orchestrator, planner, prompts
  graph/                  ← Design knowledge graph
tests/
  unit/                   ← Unit tests (no Canva SDK required)
docs/
  setup.md                ← Setup guide
  canva-capabilities.md   ← Verified API capability matrix
```

## Limitations

- Gradient fills are not yet supported by the Canva Design Editing API
- Font family changes require a separate Fonts API integration (Phase 3+)
- Text element height cannot be set (auto-sized by Canva)
- Only works with absolute pages (not Canva Docs or whiteboards)
- Agent requires an internet connection to reach the LLM API
