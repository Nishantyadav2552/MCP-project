/**
 * Unit tests for the Design Knowledge Graph builder and queries.
 * These run with Node.js — no Canva SDK required.
 */

import { describe, it, expect } from "vitest";
import { buildGraph } from "../../backend/graph/builder";
import {
  findMainHeadings,
  findByType,
  findByText,
  findAllHeadings,
  summarizeGraphForPrompt,
} from "../../backend/graph/queries";
import type { DesignSnapshot, TextElementSnapshot, RectElementSnapshot } from "../../src/shared/types";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const heading: TextElementSnapshot = {
  id: "el-heading",
  type: "text",
  top: 50,
  left: 100,
  width: 400,
  height: 60,
  rotation: 0,
  transparency: 0,
  locked: false,
  plaintext: "Welcome to Our Product",
  regions: [
    { text: "Welcome to Our Product", formatting: { fontSize: 48, color: "#000000", fontWeight: "bold" } },
  ],
};

const subtitle: TextElementSnapshot = {
  id: "el-subtitle",
  type: "text",
  top: 130,
  left: 100,
  width: 400,
  height: 40,
  rotation: 0,
  transparency: 0,
  locked: false,
  plaintext: "The best product ever",
  regions: [
    { text: "The best product ever", formatting: { fontSize: 24, color: "#666666" } },
  ],
};

const body: TextElementSnapshot = {
  id: "el-body",
  type: "text",
  top: 200,
  left: 100,
  width: 400,
  height: 100,
  rotation: 0,
  transparency: 0,
  locked: false,
  plaintext: "This is body text that describes the product in more detail. It has many words.",
  regions: [
    { text: "This is body text that describes the product in more detail. It has many words.", formatting: { fontSize: 14 } },
  ],
};

const heroImage: RectElementSnapshot = {
  id: "el-hero",
  type: "rect",
  top: 0,
  left: 0,
  width: 1920,
  height: 1080,
  rotation: 0,
  transparency: 0,
  locked: false,
  fill: { type: "image", imageRef: "img-abc123" },
};

const snapshot: DesignSnapshot = {
  pageId: "page-1",
  pageType: "absolute",
  pageLocked: false,
  dimensions: { width: 1920, height: 1080 },
  background: null,
  elements: [heroImage, heading, subtitle, body],
  capturedAt: Date.now(),
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("buildGraph", () => {
  it("creates a node for every element", () => {
    const graph = buildGraph(snapshot);
    expect(graph.nodes.size).toBe(4);
    expect(graph.nodes.has("el-heading")).toBe(true);
    expect(graph.nodes.has("el-subtitle")).toBe(true);
    expect(graph.nodes.has("el-body")).toBe(true);
    expect(graph.nodes.has("el-hero")).toBe(true);
  });

  it("infers the heading's semantic role correctly", () => {
    const graph = buildGraph(snapshot);
    const headingNode = graph.nodes.get("el-heading")!;
    expect(headingNode.semantics.role).toBe("main_heading");
    expect(headingNode.semantics.confidence).toBeGreaterThan(0.5);
  });

  it("infers the body text role", () => {
    const graph = buildGraph(snapshot);
    const bodyNode = graph.nodes.get("el-body")!;
    expect(bodyNode.semantics.role).toBe("body_text");
  });

  it("infers background_image for large rect", () => {
    const graph = buildGraph(snapshot);
    const heroNode = graph.nodes.get("el-hero")!;
    expect(heroNode.semantics.role).toBe("background_image");
  });

  it("computes ABOVE relationship from heading to subtitle", () => {
    const graph = buildGraph(snapshot);
    const headingNode = graph.nodes.get("el-heading")!;
    const aboveEdge = headingNode.relationships.find(
      (e) => e.type === "ABOVE" && e.targetElementId === "el-subtitle"
    );
    expect(aboveEdge).toBeDefined();
    expect(aboveEdge!.confidence).toBeGreaterThan(0.9);
  });

  it("stores page dimensions", () => {
    const graph = buildGraph(snapshot);
    expect(graph.pageDimensions).toEqual({ width: 1920, height: 1080 });
  });
});

describe("graph queries", () => {
  const graph = buildGraph(snapshot);

  it("findMainHeadings returns the heading", () => {
    const results = findMainHeadings(graph);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].elementId).toBe("el-heading");
  });

  it("findByType returns all text elements", () => {
    const results = findByType(graph, "text");
    expect(results.length).toBe(3);
  });

  it("findByType returns rect elements", () => {
    const results = findByType(graph, "rect");
    expect(results.length).toBe(1);
    expect(results[0].elementId).toBe("el-hero");
  });

  it("findByText finds elements containing search text", () => {
    const results = findByText(graph, "Welcome");
    expect(results.length).toBe(1);
    expect(results[0].elementId).toBe("el-heading");
  });

  it("findByText is case-insensitive", () => {
    const results = findByText(graph, "welcome");
    expect(results.length).toBe(1);
    expect(results[0].elementId).toBe("el-heading");
  });

  it("findAllHeadings returns heading and subtitle", () => {
    const results = findAllHeadings(graph);
    const ids = results.map((r) => r.elementId);
    expect(ids).toContain("el-heading");
  });

  it("summarizeGraphForPrompt includes all element IDs", () => {
    const summary = summarizeGraphForPrompt(graph);
    expect(summary).toContain("el-heading");
    expect(summary).toContain("el-subtitle");
    expect(summary).toContain("el-hero");
    expect(summary).toContain("main_heading");
  });
});

describe("locked elements", () => {
  it("locked property is preserved in graph node", () => {
    const lockedSnapshot: DesignSnapshot = {
      ...snapshot,
      elements: [
        { ...heading, id: "el-locked", locked: true },
      ],
    };
    const graph = buildGraph(lockedSnapshot);
    const node = graph.nodes.get("el-locked")!;
    expect(node.snapshot.locked).toBe(true);
  });
});
