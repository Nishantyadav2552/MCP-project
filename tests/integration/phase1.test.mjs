import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SimulationCanvaAdapter } from "@canva-cursor/canva-adapter";
import { DesignOperationSchema } from "@canva-cursor/shared";

describe("Phase 1: Minimal Real End-to-End Canva Editing Workflow", () => {
  test("1. Read supported design elements and extract stable handle ID", async () => {
    const adapter = new SimulationCanvaAdapter({
      designId: "design_phase1_test",
      dimensions: { width: 1920, height: 1080 },
      backgroundColor: "#FFFFFF",
      elements: [
        {
          type: "text",
          top: 150,
          left: 200,
          width: 800,
          height: 100,
          rotation: 0,
          transparency: 1,
          locked: false,
          text: "Welcome to Our Platform",
          color: "#000000",
          fontSize: 48,
          fontFamily: "Inter",
        },
      ],
    });

    const snapshot = await adapter.getSnapshot();

    assert.equal(snapshot.designId, "design_phase1_test");
    assert.equal(snapshot.page.dimensions.width, 1920);
    assert.equal(snapshot.page.dimensions.height, 1080);
    assert.equal(snapshot.page.elements.length, 1);

    const heading = snapshot.page.elements[0];
    assert.ok(heading.id.startsWith("elem_text_"), `Expected handle ID format, got ${heading.id}`);
    assert.equal(heading.type, "text");
    assert.equal(heading.text, "Welcome to Our Platform");
    assert.equal(heading.formatting?.color, "#000000");
    assert.equal(heading.geometry.top, 150);
  });

  test("2. Modify supported text color to blue (#0000FF), sync, and verify result", async () => {
    const adapter = new SimulationCanvaAdapter();
    const initialSnapshot = await adapter.getSnapshot();
    const heading = initialSnapshot.page.elements.find((el) => el.type === "text");
    assert.ok(heading, "Text element must exist");

    // Validate operation schema with Zod
    const rawOp = {
      type: "update_text_color",
      targetElementId: heading.id,
      color: "#0000FF",
    };
    const validatedOp = DesignOperationSchema.parse(rawOp);

    // Apply mutation through Canva Adapter
    const opResult = await adapter.applyOperation(validatedOp);

    assert.equal(opResult.success, true, "Operation must succeed");
    assert.equal(opResult.verified, true, "Operation must be verified post-sync");
    assert.equal(opResult.targetElementId, heading.id);
    assert.deepEqual(opResult.previousValue, { color: "#111827" });
    assert.deepEqual(opResult.newValue, { color: "#0000FF" });

    // Read back fresh design snapshot
    const postSnapshot = await adapter.getSnapshot();
    const updatedHeading = postSnapshot.page.elements.find((el) => el.id === heading.id);
    assert.ok(updatedHeading);
    assert.equal(updatedHeading.formatting?.color, "#0000FF", "Read-back color must be #0000FF");

    // Adapter read-back verification tool
    const verification = await adapter.verifyElement(heading.id, {
      formatting: { color: "#0000FF" },
    });
    assert.equal(verification.verified, true);
    assert.equal(verification.diff, undefined);
  });

  test("3. Move supported element to top of page (top: 40), sync, and verify result", async () => {
    const adapter = new SimulationCanvaAdapter();
    const initialSnapshot = await adapter.getSnapshot();
    const heading = initialSnapshot.page.elements.find((el) => el.type === "text");
    assert.ok(heading);

    const validatedMoveOp = DesignOperationSchema.parse({
      type: "move_element",
      targetElementId: heading.id,
      position: { top: 40 },
    });

    const opResult = await adapter.applyOperation(validatedMoveOp);

    assert.equal(opResult.success, true);
    assert.equal(opResult.verified, true);
    assert.equal(opResult.newValue?.top, 40);

    // Fresh snapshot verification
    const freshSnapshot = await adapter.getSnapshot();
    const movedHeading = freshSnapshot.page.elements.find((el) => el.id === heading.id);
    assert.ok(movedHeading);
    assert.equal(movedHeading.geometry.top, 40);
  });

  test("4. Safe handling: reject modifications on locked elements", async () => {
    const adapter = new SimulationCanvaAdapter({
      elements: [
        {
          type: "text",
          top: 100,
          left: 100,
          width: 300,
          height: 50,
          rotation: 0,
          transparency: 1,
          locked: true, // LOCKED ELEMENT
          text: "Protected Title",
          color: "#000000",
        },
      ],
    });

    const snapshot = await adapter.getSnapshot();
    const lockedEl = snapshot.page.elements[0];
    assert.equal(lockedEl.locked, true);

    const op = DesignOperationSchema.parse({
      type: "update_text_color",
      targetElementId: lockedEl.id,
      color: "#FF0000",
    });

    const result = await adapter.applyOperation(op);

    assert.equal(result.success, false);
    assert.equal(result.verified, false);
    assert.match(result.error || "", /locked/i);

    // Ensure state was not modified
    const postSnapshot = await adapter.getSnapshot();
    assert.equal(postSnapshot.page.elements[0].formatting?.color, "#000000");
  });

  test("5. Input validation: reject invalid hex colors", () => {
    assert.throws(
      () => {
        DesignOperationSchema.parse({
          type: "update_text_color",
          targetElementId: "elem_01",
          color: "blue", // Not a valid #RRGGBB hex
        });
      },
      /Must be a valid 6-character hex code/,
      "Zod must reject non-hex color names"
    );
  });

  test("6. Composite multi-operation workflow: change color AND move element in one batch", async () => {
    const adapter = new SimulationCanvaAdapter();
    const snapshot = await adapter.getSnapshot();
    const heading = snapshot.page.elements.find((el) => el.type === "text");
    assert.ok(heading);

    const operations = [
      DesignOperationSchema.parse({
        type: "update_text_color",
        targetElementId: heading.id,
        color: "#0000FF",
      }),
      DesignOperationSchema.parse({
        type: "move_element",
        targetElementId: heading.id,
        position: { top: 30, left: 160 },
      }),
    ];

    const results = await adapter.applyBatch(operations);

    assert.equal(results.length, 2);
    assert.ok(results[0].success);
    assert.ok(results[1].success);

    // Verify final state
    const verifyColor = await adapter.verifyElement(heading.id, {
      formatting: { color: "#0000FF" },
      geometry: { top: 30, left: 160 },
    });
    assert.equal(verifyColor.verified, true);
  });

  test("7. Compensating operation (rollback): restore previous state", async () => {
    const adapter = new SimulationCanvaAdapter();
    const snapshot = await adapter.getSnapshot();
    const heading = snapshot.page.elements.find((el) => el.type === "text");
    assert.ok(heading);

    const originalColor = heading.formatting?.color;

    // Mutate
    const op = DesignOperationSchema.parse({
      type: "update_text_color",
      targetElementId: heading.id,
      color: "#10B981", // Emerald
    });
    const result = await adapter.applyOperation(op);
    assert.equal(result.success, true);
    assert.equal(result.previousValue?.color, originalColor);

    // Rollback using recorded previousValue
    const rollbackOp = DesignOperationSchema.parse({
      type: "update_text_color",
      targetElementId: heading.id,
      color: result.previousValue?.color,
    });
    const rollbackResult = await adapter.applyOperation(rollbackOp);
    assert.equal(rollbackResult.success, true);

    const finalSnapshot = await adapter.getSnapshot();
    const restoredHeading = finalSnapshot.page.elements.find((el) => el.id === heading.id);
    assert.equal(restoredHeading?.formatting?.color, originalColor);
  });
});
