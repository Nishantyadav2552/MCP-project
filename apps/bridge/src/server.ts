import express, { Request, Response } from "express";
import cors from "cors";
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { SimulationCanvaAdapter, ICanvaAdapter } from "@canva-cursor/canva-adapter";
import { CanvaMcpService } from "@canva-cursor/mcp-server";
import { AgentExecutor } from "@canva-cursor/agent";

export function createBridgeServer(customAdapter?: ICanvaAdapter) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const adapter = customAdapter || new SimulationCanvaAdapter();
  const mcpService = new CanvaMcpService(adapter);
  const agent = new AgentExecutor(mcpService);

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: "CONNECTED", message: "Connected to Canva Cursor Bridge" }));

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  const broadcast = (data: unknown) => {
    const payload = JSON.stringify(data);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  };

  // 1. Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "canva-cursor-bridge",
      adapterType: adapter.adapterType,
      clientsCount: clients.size,
      timestamp: Date.now(),
    });
  });

  // 2. Read active design & graph
  app.get("/api/design", async (_req: Request, res: Response) => {
    try {
      const { snapshot, graph } = await mcpService.getOrRefreshGraph();
      res.json({
        snapshot,
        graph: graph.toJSON(),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // 3. Natural language instruction endpoint
  app.post("/api/agent/instruct", async (req: Request, res: Response) => {
    const { instruction, confirmed } = req.body;
    if (!instruction || typeof instruction !== "string") {
      res.status(400).json({ error: "Field 'instruction' (string) is required." });
      return;
    }

    try {
      broadcast({ type: "OPERATION_STARTING", instruction });

      const report = await agent.execute(instruction, { confirmed: Boolean(confirmed) });

      broadcast({
        type: "OPERATION_FINISHED",
        instruction,
        status: report.status,
        report,
      });

      res.json(report);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // 4. Audit history
  app.get("/api/history", (_req: Request, res: Response) => {
    const history = mcpService.getHistory(30);
    res.json({ history });
  });

  // 5. Rollback endpoint
  app.post("/api/rollback", async (_req: Request, res: Response) => {
    const history = mcpService.getHistory(1);
    if (history.length === 0) {
      res.status(400).json({ error: "No operations to roll back." });
      return;
    }

    const lastOp = history[0];
    if (!lastOp.previousValue || !lastOp.targetElementId) {
      res.status(400).json({ error: "Last operation does not have a recorded rollback state." });
      return;
    }

    try {
      let rollbackResult;
      const op = lastOp.operation;

      if (op.type === "update_text_color" && lastOp.previousValue.color) {
        rollbackResult = await mcpService.executeOperation({
          type: "update_text_color",
          targetElementId: lastOp.targetElementId,
          color: String(lastOp.previousValue.color),
        });
      } else if (op.type === "move_element" && lastOp.previousValue.top !== undefined) {
        rollbackResult = await mcpService.executeOperation({
          type: "move_element",
          targetElementId: lastOp.targetElementId,
          position: {
            top: Number(lastOp.previousValue.top),
            left: Number(lastOp.previousValue.left),
          },
        });
      } else if (op.type === "update_font_size" && lastOp.previousValue.fontSize) {
        rollbackResult = await mcpService.executeOperation({
          type: "update_font_size",
          targetElementId: lastOp.targetElementId,
          fontSize: Number(lastOp.previousValue.fontSize),
        });
      } else {
        res.status(400).json({ error: "Unsupported operation rollback type." });
        return;
      }

      broadcast({ type: "DESIGN_UPDATED", reason: "ROLLBACK" });
      res.json({ success: true, rollbackResult });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // 6. Reset design state
  app.post("/api/reset", async (_req: Request, res: Response) => {
    const freshAdapter = new SimulationCanvaAdapter();
    mcpService.setAdapter(freshAdapter);
    const { snapshot, graph } = await mcpService.getOrRefreshGraph();
    broadcast({ type: "DESIGN_RESET" });
    res.json({ success: true, snapshot, graph: graph.toJSON() });
  });

  return { app, server, mcpService, agent, adapter, broadcast };
}
