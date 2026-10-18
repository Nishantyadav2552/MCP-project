import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CanvaMcpService } from "../service/canva-mcp-service.js";

export function registerInspectionTools(server: McpServer, service: CanvaMcpService) {
  server.tool(
    "get_design_snapshot",
    "Inspects the active Canva design canvas, returning page dimensions, background, and element hierarchy.",
    {},
    async () => {
      const { snapshot, graph } = await service.getOrRefreshGraph();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                designId: snapshot.designId,
                version: snapshot.version,
                page: {
                  id: snapshot.page.id,
                  dimensions: snapshot.page.dimensions,
                  backgroundColor: snapshot.page.backgroundColor,
                  locked: snapshot.page.locked,
                  elementCount: snapshot.page.elements.length,
                },
                elements: snapshot.page.elements.map((el) => {
                  const node = graph.getNode(el.id);
                  return {
                    id: el.id,
                    type: el.type,
                    role: node?.semanticRole.value || "unknown",
                    roleConfidence: node?.semanticRole.confidence,
                    text: el.text,
                    geometry: el.geometry,
                    formatting: el.formatting,
                    fillColor: el.fillColor,
                    locked: el.locked,
                  };
                }),
                stateHash: graph.stateHash,
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
    "get_node_details",
    "Returns detailed properties, text styling, and all spatial/semantic relationships for a specific element ID.",
    {
      elementId: z.string().describe("Stable Canva element handle ID (e.g. 'elem_text_...')"),
    },
    async ({ elementId }) => {
      const { graph } = await service.getOrRefreshGraph();
      const node = graph.getNode(elementId);

      if (!node) {
        return {
          isError: true,
          content: [{ type: "text", text: `Element '${elementId}' not found in active design.` }],
        };
      }

      const outgoing = graph.getOutgoingEdges(elementId);
      const incoming = graph.getIncomingEdges(elementId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: node.id,
                type: node.type,
                role: node.semanticRole.value,
                roleConfidence: node.semanticRole.confidence,
                geometry: node.geometry.value,
                text: node.text?.value,
                formatting: node.formatting?.value,
                fillColor: node.fillColor?.value,
                locked: node.locked.value,
                relationships: {
                  outgoing: outgoing.map((e) => ({ target: e.targetId, type: e.type, metadata: e.metadata })),
                  incoming: incoming.map((e) => ({ source: e.sourceId, type: e.type, metadata: e.metadata })),
                },
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
    "find_main_headings",
    "Finds the primary main heading element(s) in the design using semantic knowledge graph inference.",
    {},
    async () => {
      const { query } = await service.getOrRefreshGraph();
      const mainHeading = query.findMainHeading();

      if (!mainHeading) {
        return {
          content: [{ type: "text", text: JSON.stringify({ found: false, message: "No text heading found on page." }) }],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                found: true,
                heading: {
                  id: mainHeading.id,
                  text: mainHeading.text?.value,
                  role: mainHeading.semanticRole.value,
                  geometry: mainHeading.geometry.value,
                  formatting: mainHeading.formatting?.value,
                },
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
    "find_elements_by_text",
    "Searches for elements containing specific text characters.",
    {
      queryText: z.string().describe("Text snippet to search for"),
    },
    async ({ queryText }) => {
      const { query } = await service.getOrRefreshGraph();
      const matches = query.findElementsByText(queryText);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              matches.map((m) => ({
                id: m.id,
                text: m.text?.value,
                role: m.semanticRole.value,
                geometry: m.geometry.value,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "find_elements_by_type",
    "Finds elements of a specific type (text, shape, rect, group, embed).",
    {
      type: z.enum(["text", "shape", "rect", "group", "embed"]),
    },
    async ({ type }) => {
      const { query } = await service.getOrRefreshGraph();
      const matches = query.findElementsByType(type);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              matches.map((m) => ({
                id: m.id,
                role: m.semanticRole.value,
                text: m.text?.value,
                geometry: m.geometry.value,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "query_design_graph",
    "Executes advanced relational queries on the Design Knowledge Graph (e.g. find aligned elements, near elements, or resolve natural language target).",
    {
      mode: z.enum(["resolve_target", "aligned_with", "near", "same_style"]),
      targetElementId: z.string().optional().describe("Element ID (required for aligned_with, near, same_style)"),
      instructionQuery: z.string().optional().describe("User natural language phrase (required for resolve_target)"),
    },
    async ({ mode, targetElementId, instructionQuery }) => {
      const { query } = await service.getOrRefreshGraph();

      if (mode === "resolve_target") {
        if (!instructionQuery) {
          return { isError: true, content: [{ type: "text", text: "instructionQuery is required for resolve_target mode" }] };
        }
        const candidates = query.resolveTarget(instructionQuery);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                candidates.map((c) => ({
                  id: c.node.id,
                  role: c.node.semanticRole.value,
                  text: c.node.text?.value,
                  confidence: c.confidence,
                  matchReasons: c.matchReasons,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      if (!targetElementId) {
        return { isError: true, content: [{ type: "text", text: "targetElementId is required for relational queries" }] };
      }

      if (mode === "aligned_with") {
        const aligned = query.getAlignedElements(targetElementId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                aligned.map((a) => ({ id: a.node.id, role: a.node.semanticRole.value, axis: a.axis, delta: a.delta })),
                null,
                2
              ),
            },
          ],
        };
      }

      if (mode === "near") {
        const near = query.getElementsNear(targetElementId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                near.map((n) => ({ id: n.node.id, role: n.node.semanticRole.value, distance: n.distance })),
                null,
                2
              ),
            },
          ],
        };
      }

      if (mode === "same_style") {
        const sameStyle = query.getSimilarlyStyledElements(targetElementId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                sameStyle.map((s) => ({ id: s.id, role: s.semanticRole.value, text: s.text?.value })),
                null,
                2
              ),
            },
          ],
        };
      }

      return { isError: true, content: [{ type: "text", text: `Unknown query mode: ${mode}` }] };
    }
  );
}
