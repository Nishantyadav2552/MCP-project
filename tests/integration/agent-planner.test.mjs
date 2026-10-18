import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AgentExecutor } from "@canva-cursor/agent";
import { CanvaMcpService } from "@canva-cursor/mcp-server";
import { SimulationCanvaAdapter } from "@canva-cursor/canva-adapter";

describe("Phase 4: Agent Planner & End-to-End Workflow Verification", () => {
  function setupAgent(elementsOverride) {
    const adapter = new SimulationCanvaAdapter({
      dimensions: { width: 1920, height: 1080 },
      backgroundColor: "#FFFFFF",
      elements: elementsOverride || [
        {
          type: "text",
          top: 150,
          left: 160,
          width: 800,
          height: 90,
          rotation: 0,
          transparency: 1,
          locked: false,
          text: "Welcome to Our Platform",
          color: "#000000",
          fontSize: 52,
          fontFamily: "Inter",
          fontWeight: "bold",
        },
        {
          type: "text",
          top: 260,
          left: 200,
          width: 600,
          height: 40,
          rotation: 0,
          transparency: 1,
          locked: false,
          text: "Build something great with AI and precision",
          color: "#4B5563",
          fontSize: 22,
          fontFamily: "Inter",
          fontWeight: "normal",
        },
        {
          type: "rect",
          top: 350,
          left: 160,
          width: 180,
          height: 50,
          rotation: 0,
          transparency: 1,
          locked: false,
          fillColor: "#2563EB",
        },
      ],
    });

    const mcpService = new CanvaMcpService(adapter);
    const agent = new AgentExecutor(mcpService);
    return { agent, mcpService, adapter };
  }

  test("1. End-to-End Composite Workflow: 'Make the main heading blue and move it to the top of the page.'", async () => {
    const { agent, mcpService } = setupAgent();

    const report = await agent.execute("Make the main heading blue and move it to the top of the page.");

    assert.equal(report.status, "completed");
    assert.equal(report.summary.totalPlanned, 2);
    assert.equal(report.summary.succeeded, 2);
    assert.equal(report.summary.verified, 2);

    // Verify operations executed in plan
    const ops = report.plan.operations;
    assert.equal(ops[0].type, "update_text_color");
    assert.equal(ops[0].color, "#0000FF");
    assert.equal(ops[1].type, "move_element");
    assert.equal(ops[1].position.top, 40);

    // Assert live canvas state verified
    const { snapshot } = await mcpService.getOrRefreshGraph();
    const heading = snapshot.page.elements[0];
    assert.equal(heading.formatting?.color, "#0000FF");
    assert.equal(heading.geometry.top, 40);

    // Human explanation contains diffs
    assert.match(report.explanation, /#0000FF/);
    assert.match(report.explanation, /top: 40/);
  });

  test("2. Font size adjustment: 'Increase the font size of the title to 36.'", async () => {
    const { agent, mcpService } = setupAgent();

    const report = await agent.execute("Increase the font size of the title to 36.");

    assert.equal(report.status, "completed");
    const { snapshot } = await mcpService.getOrRefreshGraph();
    assert.equal(snapshot.page.elements[0].formatting?.fontSize, 36);
  });

  test("3. Background color modification: 'Change the background to a light beige.'", async () => {
    const { agent, mcpService } = setupAgent();

    const report = await agent.execute("Change the background to a light beige.");

    assert.equal(report.status, "completed");
    const { snapshot } = await mcpService.getOrRefreshGraph();
    assert.equal(snapshot.page.backgroundColor, "#FAF0E6");
  });

  test("4. Alignment workflow: 'Align the subtitle with the heading.'", async () => {
    const { agent, mcpService } = setupAgent();

    // Initial subtitle left is 200, heading left is 160
    const report = await agent.execute("Align the subtitle with the heading.");

    assert.equal(report.status, "completed");
    const { snapshot } = await mcpService.getOrRefreshGraph();
    const subtitle = snapshot.page.elements[1];
    assert.equal(subtitle.geometry.left, 160, "Subtitle must align to heading left (160)");
  });

  test("5. Ambiguity handling triggers clarification request", async () => {
    // Two headings with identical confidence and text
    const { agent } = setupAgent([
      {
        type: "text",
        top: 100,
        left: 100,
        width: 400,
        height: 60,
        rotation: 0,
        transparency: 1,
        locked: false,
        text: "Section One Heading",
        color: "#000000",
        fontSize: 40,
        fontFamily: "Inter",
      },
      {
        type: "text",
        top: 200,
        left: 100,
        width: 400,
        height: 60,
        rotation: 0,
        transparency: 1,
        locked: false,
        text: "Section Two Heading",
        color: "#000000",
        fontSize: 40,
        fontFamily: "Inter",
      },
    ]);

    const report = await agent.execute("Make the heading blue");

    assert.equal(report.status, "need_clarification");
    assert.equal(report.currentStep, "NEED_CLARIFICATION");
    assert.ok(report.clarification);
    assert.ok(report.clarification.options.length >= 2);
    assert.match(report.clarification.question, /Multiple elements matched/i);
  });

  test("6. Destructive operation safety guard", async () => {
    const { agent, mcpService } = setupAgent();

    // Without confirmation -> awaiting_confirmation
    const unconfirmedReport = await agent.execute("Delete the button");
    assert.equal(unconfirmedReport.status, "awaiting_confirmation");

    // With confirmation -> executed
    const confirmedReport = await agent.execute("Delete the button", { confirmed: true });
    assert.equal(confirmedReport.status, "completed");

    const { snapshot } = await mcpService.getOrRefreshGraph();
    assert.equal(snapshot.page.elements.length, 2, "Button must have been deleted");
  });

  test("7. Plan validation rejects modifications to locked elements", async () => {
    const { agent } = setupAgent([
      {
        type: "text",
        top: 100,
        left: 100,
        width: 400,
        height: 60,
        rotation: 0,
        transparency: 1,
        locked: true, // LOCKED
        text: "Protected Title",
        color: "#000000",
        fontSize: 40,
      },
    ]);

    const report = await agent.execute("Make the main heading blue");

    assert.equal(report.status, "failed");
    assert.match(report.explanation, /locked/i);
  });
});
