import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CanvaMcpService } from "./service/canva-mcp-service.js";
import { registerInspectionTools } from "./tools/inspection-tools.js";
import { registerStylingTools } from "./tools/styling-tools.js";
import { registerLayoutTools } from "./tools/layout-tools.js";
import { registerStructureTools } from "./tools/structure-tools.js";
import { registerVerificationTools } from "./tools/verification-tools.js";
import { ICanvaAdapter } from "@canva-cursor/canva-adapter";

export function createCanvaMcpServer(options?: {
  adapter?: ICanvaAdapter;
  name?: string;
  version?: string;
}): { server: McpServer; service: CanvaMcpService } {
  const service = new CanvaMcpService(options?.adapter);

  const server = new McpServer({
    name: options?.name || "canva-cursor-mcp",
    version: options?.version || "0.1.0",
  });

  // Register all typed tools
  registerInspectionTools(server, service);
  registerStylingTools(server, service);
  registerLayoutTools(server, service);
  registerStructureTools(server, service);
  registerVerificationTools(server, service);

  return { server, service };
}
