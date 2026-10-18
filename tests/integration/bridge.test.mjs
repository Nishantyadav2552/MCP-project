import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createBridgeServer } from "@canva-cursor/bridge/server";

describe("Phase 5: Canva Bridge Protocol & Recovery Verification", () => {
  let bridgeServer;
  let baseUrl;
  const PORT = 3099;

  before(async () => {
    const { server } = createBridgeServer();
    bridgeServer = server;
    await new Promise((resolve) => {
      server.listen(PORT, resolve);
    });
    baseUrl = `http://localhost:${PORT}`;
  });

  after(async () => {
    await new Promise((resolve) => bridgeServer.close(resolve));
  });

  test("1. Health endpoint returns operational status and bridge metadata", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "ok");
    assert.equal(data.service, "canva-cursor-bridge");
  });

  test("2. Design endpoint returns active snapshot and knowledge graph", async () => {
    const res = await fetch(`${baseUrl}/api/design`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.snapshot);
    assert.ok(data.graph);
    assert.ok(data.graph.nodeCount > 0);
  });

  test("3. Instruct endpoint parses natural language and executes verified mutations", async () => {
    const res = await fetch(`${baseUrl}/api/agent/instruct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction: "Make the main heading blue." }),
    });

    assert.equal(res.status, 200);
    const report = await res.json();
    assert.equal(report.status, "completed");
    assert.equal(report.summary.succeeded, 1);
    assert.equal(report.summary.verified, 1);

    // Verify fresh design has updated blue color
    const designRes = await fetch(`${baseUrl}/api/design`);
    const designData = await designRes.json();
    const heading = designData.snapshot.page.elements.find((el) => el.type === "text");
    assert.equal(heading.formatting?.color, "#0000FF");
  });

  test("4. History endpoint records operations and rollback restores state", async () => {
    const historyRes = await fetch(`${baseUrl}/api/history`);
    const historyData = await historyRes.json();
    assert.ok(historyData.history.length >= 1);

    // Rollback
    const rollbackRes = await fetch(`${baseUrl}/api/rollback`, { method: "POST" });
    assert.equal(rollbackRes.status, 200);
    const rollbackData = await rollbackRes.json();
    assert.equal(rollbackData.success, true);

    // Verify state was restored
    const designRes = await fetch(`${baseUrl}/api/design`);
    const designData = await designRes.json();
    const heading = designData.snapshot.page.elements.find((el) => el.type === "text");
    assert.notEqual(heading.formatting?.color, "#0000FF");
  });
});
