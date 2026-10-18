import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CanvaMcpService } from "../service/canva-mcp-service.js";

export function registerLayoutTools(server: McpServer, service: CanvaMcpService) {
  server.tool(
    "move_element",
    "Moves an element to a new spatial position on the canvas by specifying 'top' and/or 'left' coordinates in pixels.",
    {
      targetElementId: z.string().describe("Stable Canva element handle ID"),
      top: z.number().min(-32768).max(32767).optional().describe("Distance from the top edge in pixels"),
      left: z.number().min(-32768).max(32767).optional().describe("Distance from the left edge in pixels"),
    },
    async ({ targetElementId, top, left }) => {
      if (top === undefined && left === undefined) {
        return {
          isError: true,
          content: [{ type: "text", text: "At least one of 'top' or 'left' must be specified." }],
        };
      }

      const result = await service.executeOperation({
        type: "move_element",
        targetElementId,
        position: { top, left },
      });

      return {
        isError: !result.success,
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "align_elements",
    "Aligns a target element with a reference element along an axis (left, right, top, bottom, center_x, center_y).",
    {
      targetElementId: z.string().describe("Element handle ID to move"),
      referenceElementId: z.string().describe("Reference element handle ID to align against"),
      axis: z.enum(["left", "right", "top", "bottom", "center_x", "center_y"]).describe("Alignment axis"),
    },
    async ({ targetElementId, referenceElementId, axis }) => {
      const { graph } = await service.getOrRefreshGraph();
      const targetNode = graph.getNode(targetElementId);
      const refNode = graph.getNode(referenceElementId);

      if (!targetNode) {
        return { isError: true, content: [{ type: "text", text: `Target element '${targetElementId}' not found.` }] };
      }
      if (!refNode) {
        return { isError: true, content: [{ type: "text", text: `Reference element '${referenceElementId}' not found.` }] };
      }

      const targetGeom = targetNode.geometry.value;
      const refGeom = refNode.geometry.value;

      let newTop: number | undefined;
      let newLeft: number | undefined;

      switch (axis) {
        case "left":
          newLeft = refGeom.left;
          break;
        case "right":
          newLeft = refGeom.left + refGeom.width - targetGeom.width;
          break;
        case "top":
          newTop = refGeom.top;
          break;
        case "bottom":
          newTop = refGeom.top + refGeom.height - targetGeom.height;
          break;
        case "center_x":
          newLeft = refGeom.left + refGeom.width / 2 - targetGeom.width / 2;
          break;
        case "center_y":
          newTop = refGeom.top + refGeom.height / 2 - targetGeom.height / 2;
          break;
      }

      const result = await service.executeOperation({
        type: "move_element",
        targetElementId,
        position: { top: newTop !== undefined ? Math.round(newTop) : undefined, left: newLeft !== undefined ? Math.round(newLeft) : undefined },
      });

      return {
        isError: !result.success,
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "distribute_elements",
    "Distributes three or more elements evenly along an axis (horizontal or vertical) with consistent spacing.",
    {
      elementIds: z.array(z.string()).min(3).describe("List of at least 3 element IDs to space evenly"),
      axis: z.enum(["horizontal", "vertical"]).default("horizontal"),
    },
    async ({ elementIds, axis }) => {
      const { graph } = await service.getOrRefreshGraph();
      const nodes = elementIds
        .map((id) => graph.getNode(id))
        .filter((n): n is NonNullable<typeof n> => n !== undefined);

      if (nodes.length !== elementIds.length) {
        return { isError: true, content: [{ type: "text", text: "One or more element IDs were not found." }] };
      }

      if (axis === "horizontal") {
        // Sort by left coordinate
        nodes.sort((a, b) => a.geometry.value.left - b.geometry.value.left);
        const first = nodes[0].geometry.value;
        const last = nodes[nodes.length - 1].geometry.value;

        const totalSpan = last.left + last.width - first.left;
        const sumItemWidths = nodes.reduce((sum, n) => sum + n.geometry.value.width, 0);
        const gaps = nodes.length - 1;
        const spacing = (totalSpan - sumItemWidths) / gaps;

        let currentLeft = first.left + first.width + spacing;
        const results = [];

        for (let i = 1; i < nodes.length - 1; i++) {
          const res = await service.executeOperation({
            type: "move_element",
            targetElementId: nodes[i].id,
            position: { left: Math.round(currentLeft) },
          });
          results.push(res);
          currentLeft += nodes[i].geometry.value.width + spacing;
        }

        return { content: [{ type: "text", text: JSON.stringify({ success: true, distributedCount: results.length, spacing: Math.round(spacing) }, null, 2) }] };
      } else {
        // Vertical distribution
        nodes.sort((a, b) => a.geometry.value.top - b.geometry.value.top);
        const first = nodes[0].geometry.value;
        const last = nodes[nodes.length - 1].geometry.value;

        const totalSpan = last.top + last.height - first.top;
        const sumItemHeights = nodes.reduce((sum, n) => sum + n.geometry.value.height, 0);
        const gaps = nodes.length - 1;
        const spacing = (totalSpan - sumItemHeights) / gaps;

        let currentTop = first.top + first.height + spacing;
        const results = [];

        for (let i = 1; i < nodes.length - 1; i++) {
          const res = await service.executeOperation({
            type: "move_element",
            targetElementId: nodes[i].id,
            position: { top: Math.round(currentTop) },
          });
          results.push(res);
          currentTop += nodes[i].geometry.value.height + spacing;
        }

        return { content: [{ type: "text", text: JSON.stringify({ success: true, distributedCount: results.length, spacing: Math.round(spacing) }, null, 2) }] };
      }
    }
  );
}
