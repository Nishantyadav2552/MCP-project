import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CanvaMcpService } from "../service/canva-mcp-service.js";

export function registerStructureTools(server: McpServer, service: CanvaMcpService) {
  server.tool(
    "delete_element",
    "Removes an element from the design canvas. Requires explicit confirmation because deletion is a destructive operation.",
    {
      targetElementId: z.string().describe("Stable Canva element handle ID to delete"),
      confirmed: z.boolean().describe("Must be explicitly true to confirm permanent deletion"),
    },
    async ({ targetElementId, confirmed }) => {
      if (!confirmed) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({
                requiresConfirmation: true,
                message: `Deletion of element '${targetElementId}' requires explicit user confirmation. Set confirmed: true to execute.`,
              }),
            },
          ],
        };
      }

      const result = await service.executeOperation({
        type: "delete_element",
        targetElementId,
        requireConfirmation: true,
      });

      return {
        isError: !result.success,
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
