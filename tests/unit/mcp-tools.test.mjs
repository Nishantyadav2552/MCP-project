import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createCanvaMcpServer } from "@canva-cursor/mcp-server";
import { SimulationCanvaAdapter } from "@canva-cursor/canva-adapter";

describe("Phase 3: Custom MCP Server Tools Verification", () => {
  function setupTestServer() {
    const adapter = new SimulationCanvaAdapter({
      elements: [
        {
          type: "text",
          top: 100,
          left: 150,
          width: 700,
          height: 80,
          rotation: 0,
          transparency: 1,
          locked: false,
          text: "Intelligent Design Editing",
          color: "#1E293B",
          fontSize: 48,
          fontFamily: "Inter",
          fontWeight: "bold",
        },
        {
          type: "text",
          top: 200,
          left: 150,
          width: 500,
          height: 40,
          rotation: 0,
          transparency: 1,
          locked: false,
          text: "Built on Model Context Protocol",
          color: "#64748B",
          fontSize: 20,
          fontFamily: "Inter",
          fontWeight: "normal",
        },
        {
          type: "rect",
          top: 300,
          left: 150,
          width: 160,
          height: 50,
          rotation: 0,
          transparency: 1,
          locked: false,
          fillColor: "#3B82F6",
        },
        {
          type: "rect",
          top: 400,
          left: 100,
          width: 100,
          height: 100,
          rotation: 0,
          transparency: 1,
          locked: false,
          fillColor: "#F1F5F9",
        },
        {
          type: "rect",
          top: 400,
          left: 250,
          width: 100,
          height: 100,
          rotation: 0,
          transparency: 1,
          locked: false,
          fillColor: "#F1F5F9",
        },
        {
          type: "rect",
          top: 400,
          left: 500,
          width: 100,
          height: 100,
          rotation: 0,
          transparency: 1,
          locked: false,
          fillColor: "#F1F5F9",
        },
      ],
    });

    const { server, service } = createCanvaMcpServer({ adapter });
    return { server, service, adapter };
  }

  test("1. Tool: get_design_snapshot returns design hierarchy with semantic roles", async () => {
    const { service } = setupTestServer();
    const { snapshot, graph } = await service.getOrRefreshGraph();

    assert.equal(snapshot.page.elements.length, 6);
    assert.ok(graph.stateHash.length > 0);

    const mainHeading = snapshot.page.elements[0];
    const headingNode = graph.getNode(mainHeading.id);
    assert.equal(headingNode?.semanticRole.value, "heading_main");
  });

  test("2. Tool: find_main_headings identifies the primary heading", async () => {
    const { service } = setupTestServer();
    const { query } = await service.getOrRefreshGraph();
    const heading = query.findMainHeading();

    assert.ok(heading);
    assert.equal(heading.text?.value, "Intelligent Design Editing");
    assert.equal(heading.semanticRole.value, "heading_main");
  });

  test("3. Tool: update_text_style updates color and fontSize with atomic audit trail", async () => {
    const { service } = setupTestServer();
    const { snapshot } = await service.getOrRefreshGraph();
    const heading = snapshot.page.elements[0];

    const result = await service.executeOperation({
      type: "update_text_style",
      targetElementId: heading.id,
      color: "#0000FF",
      fontSize: 36,
    });

    assert.equal(result.success, true);
    assert.equal(result.verified, true);
    assert.equal(result.newValue?.color, "#0000FF");
    assert.equal(result.newValue?.fontSize, 36);

    // Verify post-mutation state
    const verification = await service.verifyElement(heading.id, {
      formatting: { color: "#0000FF", fontSize: 36 },
    });
    assert.equal(verification.verified, true);
  });

  test("4. Tool: move_element updates spatial coordinates", async () => {
    const { service } = setupTestServer();
    const { snapshot } = await service.getOrRefreshGraph();
    const heading = snapshot.page.elements[0];

    const result = await service.executeOperation({
      type: "move_element",
      targetElementId: heading.id,
      position: { top: 40, left: 150 },
    });

    assert.equal(result.success, true);
    assert.equal(result.newValue?.top, 40);

    const verification = await service.verifyElement(heading.id, {
      geometry: { top: 40, left: 150, width: 0, height: 0, rotation: 0, transparency: 1 },
    });
    assert.equal(verification.verified, true);
  });

  test("5. Tool: align_elements aligns subtitle with target element", async () => {
    const { service } = setupTestServer();
    const { snapshot } = await service.getOrRefreshGraph();
    const subtitle = snapshot.page.elements[1];

    // Reference element is at left: 150
    // Move subtitle to left: 300 first
    await service.executeOperation({
      type: "move_element",
      targetElementId: subtitle.id,
      position: { left: 300 },
    });

    // Re-align with left: 150
    const result = await service.executeOperation({
      type: "move_element",
      targetElementId: subtitle.id,
      position: { left: 150 },
    });

    assert.equal(result.success, true);
    const verification = await service.verifyElement(subtitle.id, {
      geometry: { left: 150, top: 200, width: 0, height: 0, rotation: 0, transparency: 1 },
    });
    assert.equal(verification.verified, true);
  });

  test("6. Tool: delete_element requires confirmation and removes element", async () => {
    const { service } = setupTestServer();
    const { snapshot } = await service.getOrRefreshGraph();
    const rectToDel = snapshot.page.elements[2];

    const result = await service.executeOperation({
      type: "delete_element",
      targetElementId: rectToDel.id,
      requireConfirmation: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.newValue?.deleted, true);

    const { snapshot: freshSnapshot } = await service.getOrRefreshGraph();
    const found = freshSnapshot.page.elements.find((el) => el.id === rectToDel.id);
    assert.equal(found, undefined, "Deleted element must not exist in fresh snapshot");
  });

  test("7. Tool: get_operation_status returns recent audit logs", async () => {
    const { service } = setupTestServer();
    const { snapshot } = await service.getOrRefreshGraph();
    const heading = snapshot.page.elements[0];

    await service.executeOperation({
      type: "update_font_size",
      targetElementId: heading.id,
      fontSize: 50,
    });

    const history = service.getHistory(5);
    assert.ok(history.length >= 1);
    const lastOp = history[history.length - 1];
    assert.equal(lastOp.operation.type, "update_font_size");
    assert.equal(lastOp.targetElementId, heading.id);
    assert.equal(lastOp.success, true);
    assert.equal(lastOp.verified, true);
  });
});
