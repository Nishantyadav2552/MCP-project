/**
 * Unit tests for post-execution verification and compareProperty.
 */

import { describe, it, expect, vi } from "vitest";
import { compareProperty, verifyResults } from "../../src/canva/verifier";
import type { OperationPlan, OperationResult } from "../../src/shared/types";
import * as canvaDesign from "@canva/design";

describe("compareProperty", () => {
  it("matches identical strings (e.g. colors)", () => {
    expect(compareProperty("#ff0099", "#ff0099")).toBe(true);
    expect(compareProperty("#000000", "#ffffff")).toBe(false);
  });

  it("matches text content strings", () => {
    expect(compareProperty("New heading", "New heading")).toBe(true);
    expect(compareProperty("Heading A", "Heading B")).toBe(false);
  });

  it("matches numbers exactly when tolerance is 0", () => {
    expect(compareProperty(42, 42)).toBe(true);
    expect(compareProperty(42, 43)).toBe(false);
  });

  it("allows tolerance for element position comparisons", () => {
    expect(compareProperty(100, 101, 2)).toBe(true);
    expect(compareProperty(100, 102, 2)).toBe(true);
    expect(compareProperty(100, 98, 2)).toBe(true);
    expect(compareProperty(100, 103, 2)).toBe(false);
    expect(compareProperty(100, 97, 2)).toBe(false);
  });

  it("rejects mismatched types", () => {
    expect(compareProperty(100, "100")).toBe(false);
    expect(compareProperty("#000", undefined)).toBe(false);
  });
});

describe("verifyResults with mocked openDesign", () => {
  it("verifies matching text style and sets verifiedProperties", async () => {
    const mockElement = {
      type: "text",
      text: {
        readTextRegions: () => [{ text: "Hello", formatting: { color: "#ff0000", fontSize: 32 } }],
      },
    };

    const mockSession = {
      page: {
        type: "absolute",
        elements: {
          toArray: () => [mockElement],
        },
      },
    };

    vi.spyOn(canvaDesign, "openDesign").mockImplementation(async (_opts: any, cb: any) => {
      await cb(mockSession);
    });

    const plan: OperationPlan = {
      planId: "p1",
      description: "Update style",
      snapshotElementCount: 1,
      operations: [
        {
          type: "update_text_style",
          elementId: "el-0",
          formatting: { color: "#ff0000", fontSize: 32 },
        },
      ],
    };

    const results: OperationResult[] = [
      {
        operationIndex: 0,
        operationType: "update_text_style",
        status: "succeeded",
      },
    ];

    const verified = await verifyResults(plan, results);
    expect(verified[0].status).toBe("succeeded");
    expect(verified[0].verifiedProperties).toEqual({ color: "#ff0000", fontSize: 32 });
  });

  it("marks result as failed when verified property does not match expected", async () => {
    const mockElement = {
      type: "text",
      text: {
        readTextRegions: () => [{ text: "Hello", formatting: { color: "#0000ff" } }],
      },
    };

    const mockSession = {
      page: {
        type: "absolute",
        elements: {
          toArray: () => [mockElement],
        },
      },
    };

    vi.spyOn(canvaDesign, "openDesign").mockImplementation(async (_opts: any, cb: any) => {
      await cb(mockSession);
    });

    const plan: OperationPlan = {
      planId: "p2",
      description: "Update color",
      snapshotElementCount: 1,
      operations: [
        {
          type: "update_text_style",
          elementId: "el-0",
          formatting: { color: "#ff0000" },
        },
      ],
    };

    const results: OperationResult[] = [
      {
        operationIndex: 0,
        operationType: "update_text_style",
        status: "succeeded",
      },
    ];

    const verified = await verifyResults(plan, results);
    expect(verified[0].status).toBe("failed");
    expect(verified[0].errorMessage).toContain("Verification failed");
  });

  it("marks non-property-verifiable operations as succeeded_unverified", async () => {
    const mockSession = {
      page: {
        type: "absolute",
        elements: {
          toArray: () => [],
        },
      },
    };

    vi.spyOn(canvaDesign, "openDesign").mockImplementation(async (_opts: any, cb: any) => {
      await cb(mockSession);
    });

    const plan: OperationPlan = {
      planId: "p3",
      description: "Duplicate",
      snapshotElementCount: 1,
      operations: [
        {
          type: "duplicate_element",
          elementId: "el-0",
        },
      ],
    };

    const results: OperationResult[] = [
      {
        operationIndex: 0,
        operationType: "duplicate_element",
        status: "succeeded",
      },
    ];

    const verified = await verifyResults(plan, results);
    expect(verified[0].status).toBe("succeeded_unverified");
  });
});
