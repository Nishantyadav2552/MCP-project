import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CanvaMcpService } from "../service/canva-mcp-service.js";
import { HexColorSchema } from "@canva-cursor/shared";

export function registerVerificationTools(server: McpServer, service: CanvaMcpService) {
  server.tool(
    "verify_element_properties",
    "Verifies that a Canva element's live properties match the expected values post-mutation.",
    {
      elementId: z.string().describe("Stable Canva element handle ID"),
      expectedColor: HexColorSchema.optional().describe("Expected text color in hex"),
      expectedFontSize: z.number().optional().describe("Expected font size"),
      expectedTop: z.number().optional().describe("Expected top coordinate"),
      expectedLeft: z.number().optional().describe("Expected left coordinate"),
      expectedFillColor: HexColorSchema.optional().describe("Expected shape fill color"),
    },
    async ({ elementId, expectedColor, expectedFontSize, expectedTop, expectedLeft, expectedFillColor }) => {
      const expected: Parameters<typeof service.verifyElement>[1] = {};

      if (expectedTop !== undefined || expectedLeft !== undefined) {
        expected.geometry = {
          top: expectedTop ?? 0,
          left: expectedLeft ?? 0,
          width: 0,
          height: 0,
          rotation: 0,
          transparency: 1,
        };
      }

      if (expectedColor !== undefined || expectedFontSize !== undefined) {
        expected.formatting = {
          color: expectedColor,
          fontSize: expectedFontSize,
        };
      }

      if (expectedFillColor !== undefined) {
        expected.fillColor = expectedFillColor;
      }

      const verification = await service.verifyElement(elementId, expected);

      return {
        isError: !verification.verified,
        content: [{ type: "text", text: JSON.stringify(verification, null, 2) }],
      };
    }
  );

  server.tool(
    "refresh_design_state",
    "Forces a synchronization check and re-reads the active Canva design canvas.",
    {},
    async () => {
      const { snapshot, graph } = await service.getOrRefreshGraph();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                designId: snapshot.designId,
                version: snapshot.version,
                stateHash: graph.stateHash,
                elementCount: snapshot.page.elements.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "get_operation_status",
    "Retrieves execution audit logs and verification status for recent design operations.",
    {
      limit: z.number().min(1).max(50).default(10).describe("Number of recent records to retrieve"),
    },
    async ({ limit }) => {
      const history = service.getHistory(limit);
      return {
        content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
      };
    }
  );
}
