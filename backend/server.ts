/**
 * backend/server.ts
 *
 * Express API server for the Canva Cursor backend agent.
 *
 * Endpoints:
 *   POST /agent/plan    — Receive instruction + snapshot; return operation plan
 *   POST /agent/results — Receive execution results; return user message
 *   GET  /health        — Health check
 *
 * Security notes:
 *   - API keys are loaded from .env, never sent to the frontend
 *   - CORS is restricted to the Canva app origin in production
 *   - Request bodies are size-limited to prevent large payload attacks
 */

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { z } from "zod";
import type { AgentRequest, ExecutionResult } from "../src/shared/types";
import { handlePlanRequest, handleExecutionResult } from "./agent/orchestrator";

const app = express();
const PORT = parseInt(process.env.CANVA_BACKEND_PORT ?? "3001", 10);

// ─── Middleware ────────────────────────────────────────────────────────────────

// CORS: allow requests from the Canva app origin (set in .env)
const allowedOrigins = [
  "http://localhost:8080",
  "https://localhost:8080",
  process.env.CANVA_APP_ORIGIN,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-side tools, curl)
      if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin not allowed: ${origin}`));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// JSON body with size limit to prevent large payload attacks
app.use(express.json({ limit: "2mb" }));

// ─── Request validation schemas ────────────────────────────────────────────────

const AgentRequestSchema = z.object({
  sessionId: z.string().min(1).max(128),
  instruction: z.string().min(1).max(2000),
  snapshot: z.object({
    pageId: z.string(),
    pageType: z.enum(["absolute", "unsupported"]),
    pageLocked: z.boolean(),
    dimensions: z.object({ width: z.number(), height: z.number() }).nullable(),
    background: z.unknown().nullable(),
    elements: z.array(z.unknown()),
    capturedAt: z.number(),
  }),
  priorPlanId: z.string().optional(),
});

const ExecutionResultSchema = z.object({
  sessionId: z.string().min(1).max(128),
  planId: z.string().min(1),
  operationResults: z.array(
    z.object({
      operationIndex: z.number(),
      operationType: z.string(),
      status: z.enum(["succeeded", "succeeded_unverified", "failed", "skipped"]),
      errorMessage: z.string().optional(),
      verifiedProperties: z.record(z.unknown()).optional(),
    })
  ),
  updatedSnapshot: z.object({
    pageId: z.string(),
    pageType: z.enum(["absolute", "unsupported"]),
    pageLocked: z.boolean(),
    dimensions: z.object({ width: z.number(), height: z.number() }).nullable(),
    background: z.unknown().nullable(),
    elements: z.array(z.unknown()),
    capturedAt: z.number(),
  }),
  executedAt: z.number(),
});

// ─── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * POST /agent/plan
 * Accepts a user instruction + design snapshot.
 * Returns an operation plan or a clarification question.
 */
app.post("/agent/plan", async (req: Request, res: Response, next: NextFunction) => {
  const validation = AgentRequestSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      error: "Invalid request",
      details: validation.error.issues,
    });
    return;
  }

  try {
    const agentRequest = req.body as AgentRequest;
    const response = await handlePlanRequest(agentRequest);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /agent/results
 * Accepts execution results from the frontend.
 * Returns a user-facing summary message after refreshing the knowledge graph.
 */
app.post("/agent/results", async (req: Request, res: Response, next: NextFunction) => {
  const validation = ExecutionResultSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      error: "Invalid request",
      details: validation.error.issues,
    });
    return;
  }

  try {
    const executionResult = req.body as ExecutionResult;
    const response = await handleExecutionResult(executionResult);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ─── Error handler ─────────────────────────────────────────────────────────────

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[server] Unhandled error:", err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[canva-cursor-backend] Server running on http://localhost:${PORT}`);
  console.log(`[canva-cursor-backend] LLM provider: ${process.env.LLM_PROVIDER ?? "gemini"} / ${process.env.LLM_MODEL ?? "gemini-1.5-flash-latest"}`);
});

export default app;
