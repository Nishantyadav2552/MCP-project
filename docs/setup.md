# Canva Cursor — Setup Guide

## Prerequisites

- Node.js v24+ (`node --version`)
- npm v11+ (`npm --version`)
- A Canva account with access to the Developer Portal
- An LLM API key (Gemini, Anthropic, or OpenAI)

## Step 1: Install the Canva CLI

```bash
npm install -g @canva/cli@latest
canva login
```

`canva login` opens a browser window. Click Allow, copy the confirmation code, paste it in the terminal.

## Step 2: Create an App in the Developer Portal

Run:

```bash
canva apps create "Canva Cursor" --template="hello_world" --distribution="private"
```

This opens the Developer Portal automatically. Note your **App ID** from the app's Overview page.

## Step 3: Install Frontend Dependencies

From the project root:

```bash
npm install
```

## Step 4: Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

## Step 5: Configure Environment Variables

Copy credentials from **Developer Portal → Your App → Security → Credentials → .env file** and paste into `.env`:

```
CANVA_APP_ID=AABBccddeeff
CANVA_APP_ORIGIN=https://app-aabbccddeeff.canva-apps.com
```

Add your LLM API key (only one is needed):

```
# For Gemini (recommended):
GEMINI_API_KEY=your_key_here
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash-latest

# For Anthropic:
ANTHROPIC_API_KEY=your_key_here
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-haiku-20241022

# For OpenAI:
OPENAI_API_KEY=your_key_here
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
```

## Step 6: Start the Backend

In a separate terminal:

```bash
cd backend
npm run dev
```

The backend starts at `http://localhost:3001`.

## Step 7: Start the Frontend Dev Server

In the project root:

```bash
npm start
```

The dev server starts at `http://localhost:8080`.

## Step 8: Connect Canva to the Dev Server

1. Open the **Developer Portal** → Your App → **Inside Canva**
2. Under **App source**, set **Development URL** to `http://localhost:8080`
3. Click **Preview** — the Canva editor opens
4. Click **Open** to connect the app

The Canva Cursor panel appears in the left sidebar.

## Step 9: Enable Hot Module Replacement (optional)

Copy the HMR settings from Developer Portal → Security → Credentials → .env file into your `.env`:

```
CANVA_HMR_ENABLED=true
```

Restart the dev server after adding this.

## Running Tests

```bash
npm test
```

Unit tests run without any Canva connection or LLM calls.

## Production Deployment

1. Run `npm run build` to generate the frontend bundle.
2. Upload the bundle via **Developer Portal → Inside Canva → Upload your bundle**.
3. Deploy the backend to any Node.js hosting (Fly.io, Railway, Vercel, etc.).
4. Update `CANVA_BACKEND_HOST` in the frontend build to point to your production backend URL.
5. Set all LLM API keys as environment variables on the backend host — never in the frontend bundle.
