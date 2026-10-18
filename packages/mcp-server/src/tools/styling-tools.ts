import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CanvaMcpService } from "../service/canva-mcp-service.js";
import { HexColorSchema } from "@canva-cursor/shared";

export function registerStylingTools(server: McpServer, service: CanvaMcpService) {
  server.tool(
    "update_text_style",
    "Updates text typography and colors for a text element (color, fontSize, fontWeight, fontStyle, textAlign).",
    {
      targetElementId: z.string().describe("Stable Canva element handle ID"),
      color: HexColorSchema.optional().describe("Hex color code, e.g. '#0000FF'"),
      fontSize: z.number().min(1).max(1000).optional().describe("Font size in points (1 to 1000)"),
      fontWeight: z.enum(["normal", "bold"]).optional(),
      fontStyle: z.enum(["normal", "italic"]).optional(),
      textAlign: z.enum(["start", "center", "end", "justify"]).optional(),
    },
    async ({ targetElementId, color, fontSize, fontWeight, fontStyle, textAlign }) => {
      const result = await service.executeOperation({
        type: "update_text_style",
        targetElementId,
        color,
        fontSize,
        fontWeight,
        fontStyle,
        textAlign,
      });

      return {
        isError: !result.success,
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "update_font_size",
    "Adjusts the font size of a specific text element.",
    {
      targetElementId: z.string().describe("Stable Canva element handle ID"),
      fontSize: z.number().min(1).max(1000).describe("New font size in points (e.g. 36)"),
    },
    async ({ targetElementId, fontSize }) => {
      const result = await service.executeOperation({
        type: "update_font_size",
        targetElementId,
        fontSize,
      });

      return {
        isError: !result.success,
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "update_fill_color",
    "Updates the solid fill color of a shape or rectangular container.",
    {
      targetElementId: z.string().describe("Stable Canva element handle ID"),
      fillColor: HexColorSchema.describe("Hex color code, e.g. '#2563EB'"),
    },
    async ({ targetElementId, fillColor }) => {
      const result = await service.executeOperation({
        type: "update_fill_color",
        targetElementId,
        fillColor,
      });

      return {
        isError: !result.success,
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "update_text_content",
    "Updates the string content of a text element while preserving its formatting.",
    {
      targetElementId: z.string().describe("Stable Canva element handle ID"),
      text: z.string().describe("New text content string"),
    },
    async ({ targetElementId, text }) => {
      const result = await service.executeOperation({
        type: "update_text_content",
        targetElementId,
        text,
      });

      return {
        isError: !result.success,
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "update_background_color",
    "Changes the background color of the current design page.",
    {
      color: HexColorSchema.describe("Hex color code, e.g. '#F3F4F6'"),
    },
    async ({ color }) => {
      const result = await service.executeOperation({
        type: "update_background_color",
        color,
      });

      return {
        isError: !result.success,
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
