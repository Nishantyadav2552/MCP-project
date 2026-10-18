#!/usr/bin/env node
import process from "node:process";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCanvaMcpServer } from "./server.js";

async function main() {
  const { server } = createCanvaMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  // Log status to stderr so stdio stdout remains clean for MCP JSON-RPC protocol
  console.error("[Canva Cursor MCP] Server connected via Stdio transport.");
}

main().catch((err) => {
  console.error("[Canva Cursor MCP] Fatal error:", err);
  process.exit(1);
});
