# Setup & Developer Guide: Canva AI Design Agent

This guide covers running the project locally, configuring environment variables, running automated tests, and embedding into the Canva Apps Developer Portal.

---

## Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: v18 or higher (v20+ recommended)
- **npm** or **pnpm**
- **LLM API Key**: OpenAI, Groq, or a local OpenAI-compatible endpoint (Ollama, LMStudio)

---

## 1. Local Development Setup

### Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure your LLM settings:
   ```env
   APP_ENV=development
   PORT=8000
   HOST=0.0.0.0
   FRONTEND_ORIGINS=http://localhost:5173,http://localhost:3000

   # Set your LLM provider: "compatible", "openai", or "groq"
   LLM_PROVIDER=compatible
   LLM_API_KEY=your_api_key_here
   LLM_MODEL=gpt-4o-mini
   LLM_BASE_URL=https://api.openai.com/v1
   ```

5. Start the backend API server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API will be live at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

---

### Frontend Setup (React + Vite)

1. In a separate terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 2. Running Automated Tests

Run the complete backend test suite using `pytest`:

```bash
# From workspace root
python -m pytest -v
```

This runs:
- `test_planner.py`: Verifies intent decomposition, schema validation, and unsupported action filtering.
- `test_executor.py`: Verifies sequential task dispatch, tool validation, and semantic element resolution.
- `test_tools.py`: Validates all registered Canva design tools (`create_text`, `add_shape`, `add_image`, etc.).
- `test_state.py`: Verifies multi-turn session tracking and semantic reference resolution.
- `test_api.py`: Tests `/health`, `/api/chat`, `/api/tools`, and `/api/mcp` endpoints.
- `test_llm.py`: Verifies LLM provider factory and JSON extraction.

---

## 3. Connecting to the Official Canva Apps Developer Portal

To run this application directly inside the Canva editor as a native Canva App:

1. Log in to the [Canva Developers Portal](https://www.canva.com/developers/).
2. Create a new App and configure permissions:
   - `canva:design:content:read`
   - `canva:design:content:write`
   - `canva:asset:read`
   - `canva:asset:write`
3. In your App settings under **Development URL**, enter your local or tunnel URL:
   ```text
   http://localhost:5173
   ```
4. Open the Canva editor, open the Apps panel, and select your development app.
5. The Canva AI Agent will detect the Canva SDK iframe environment and dispatch native element mutations directly to the Canva canvas.

---

## 4. Docker Deployment

To build and run the entire stack with Docker Compose:

```bash
docker-compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
