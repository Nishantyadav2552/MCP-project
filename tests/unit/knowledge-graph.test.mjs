import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GraphBuilder,
  GraphQueryEngine,
  GraphSynchronizer,
} from "@canva-cursor/knowledge-graph";

function createMockSnapshot(overrides = {}) {
  return {
    designId: "design_kg_test_01",
    version: "v1",
    timestamp: 1700000000000,
    page: {
      id: "page_01",
      type: "absolute",
      dimensions: { width: 1920, height: 1080 },
      backgroundColor: "#FFFFFF",
      locked: false,
      elements: [
        {
          id: "elem_heading",
          type: "text",
          geometry: { top: 120, left: 160, width: 800, height: 80, rotation: 0, transparency: 1 },
          locked: false,
          zIndex: 0,
          text: "Design The Future With AI",
          formatting: {
            color: "#111827",
            fontSize: 54,
            fontFamily: "Inter",
            fontWeight: "bold",
            textAlign: "start",
          },
        },
        {
          id: "elem_subtitle",
          type: "text",
          geometry: { top: 220, left: 160, width: 650, height: 40, rotation: 0, transparency: 1 },
          locked: false,
          zIndex: 1,
          text: "Experience precision editing with Cursor-inspired architecture",
          formatting: {
            color: "#4B5563",
            fontSize: 24,
            fontFamily: "Inter",
            fontWeight: "normal",
            textAlign: "start",
          },
        },
        {
          id: "elem_cta_button",
          type: "rect",
          geometry: { top: 300, left: 160, width: 180, height: 50, rotation: 0, transparency: 1 },
          locked: false,
          zIndex: 2,
          fillColor: "#2563EB",
        },
        {
          id: "elem_cta_text",
          type: "text",
          geometry: { top: 312, left: 185, width: 130, height: 26, rotation: 0, transparency: 1 },
          locked: false,
          zIndex: 3,
          text: "Get Started",
          formatting: {
            color: "#FFFFFF",
            fontSize: 18,
            fontFamily: "Inter",
            fontWeight: "bold",
            textAlign: "center",
          },
        },
      ],
      ...overrides,
    },
  };
}

describe("Phase 2: Design Knowledge Graph Unit Tests", () => {
  const builder = new GraphBuilder();

  test("1. Constructs graph nodes with provenance tracking (authoritative vs inferred)", () => {
    const snapshot = createMockSnapshot();
    const graph = builder.buildFromSnapshot(snapshot);

    assert.equal(graph.pageNode.id, "page_01");
    assert.equal(graph.nodes.size, 4);

    const headingNode = graph.getNode("elem_heading");
    assert.ok(headingNode);

    // Authoritative properties from Canva
    assert.equal(headingNode.geometry.source, "canva_authoritative");
    assert.equal(headingNode.geometry.value.top, 120);
    assert.equal(headingNode.text?.source, "canva_authoritative");
    assert.equal(headingNode.text?.value, "Design The Future With AI");

    // Inferred semantic role
    assert.equal(headingNode.semanticRole.source, "inferred_model");
    assert.equal(headingNode.semanticRole.value, "heading_main");
    assert.ok((headingNode.semanticRole.confidence || 0) >= 0.9);
  });

  test("2. Semantic role classification (main heading, subtitle, CTA)", () => {
    const snapshot = createMockSnapshot();
    const graph = builder.buildFromSnapshot(snapshot);

    const subtitleNode = graph.getNode("elem_subtitle");
    assert.ok(subtitleNode);
    assert.equal(subtitleNode.semanticRole.value, "heading_sub");

    const ctaTextNode = graph.getNode("elem_cta_text");
    assert.ok(ctaTextNode);
    assert.equal(ctaTextNode.semanticRole.value, "cta");

    const ctaButtonNode = graph.getNode("elem_cta_button");
    assert.ok(ctaButtonNode);
    assert.equal(ctaButtonNode.semanticRole.value, "cta");
  });

  test("3. Computes spatial relationships: ALIGNED_WITH, NEAR, OVERLAPS, ABOVE/BELOW", () => {
    const snapshot = createMockSnapshot();
    const graph = builder.buildFromSnapshot(snapshot);

    // Heading (left: 160) and Subtitle (left: 160) are left-aligned
    const alignedEdges = graph.getOutgoingEdges("elem_heading", "ALIGNED_WITH");
    const leftAlignEdge = alignedEdges.find(
      (e) => e.targetId === "elem_subtitle" && e.metadata?.axis === "left"
    );
    assert.ok(leftAlignEdge, "Heading and Subtitle must be left-aligned");

    // Heading is ABOVE Subtitle
    const aboveEdges = graph.getOutgoingEdges("elem_heading", "ABOVE");
    const aboveSubtitle = aboveEdges.find((e) => e.targetId === "elem_subtitle");
    assert.ok(aboveSubtitle, "Heading must be ABOVE Subtitle");

    // Subtitle is BELOW Heading
    const belowEdges = graph.getOutgoingEdges("elem_subtitle", "BELOW");
    const belowHeading = belowEdges.find((e) => e.targetId === "elem_heading");
    assert.ok(belowHeading, "Subtitle must be BELOW Heading");

    // CTA Text OVERLAPS CTA Button Box
    const overlapEdges = graph.getOutgoingEdges("elem_cta_button", "OVERLAPS");
    const ctaOverlap = overlapEdges.find((e) => e.targetId === "elem_cta_text");
    assert.ok(ctaOverlap, "CTA Button box must OVERLAP CTA text");

    // Proximity: Subtitle is NEAR CTA Button Box (distance: 300 - (220+40) = 40px <= 80px)
    const nearEdges = graph.getOutgoingEdges("elem_subtitle", "NEAR");
    const nearCta = nearEdges.find((e) => e.targetId === "elem_cta_button");
    assert.ok(nearCta, "Subtitle must be NEAR CTA button");
  });

  test("4. Computes styling & semantic relationships (SAME_STYLE_AS, SEMANTICALLY_RELATED_TO)", () => {
    const snapshot = createMockSnapshot();
    const graph = builder.buildFromSnapshot(snapshot);

    // Heading and Subtitle share font family "Inter" and textAlign "start"
    const styleEdges = graph.getOutgoingEdges("elem_heading", "SAME_STYLE_AS");
    const styleMatch = styleEdges.find((e) => e.targetId === "elem_subtitle");
    assert.ok(styleMatch, "Heading and Subtitle should share style attributes");

    // Semantic relationship: title + subtitle pair
    const semanticEdges = graph.getOutgoingEdges("elem_heading", "SEMANTICALLY_RELATED_TO");
    const titleSubPair = semanticEdges.find(
      (e) => e.targetId === "elem_subtitle" && e.metadata?.nature === "title_subtitle_pair"
    );
    assert.ok(titleSubPair, "Heading and Subtitle must have SEMANTICALLY_RELATED_TO edge");
  });

  test("5. GraphQueryEngine answers key architectural questions", () => {
    const snapshot = createMockSnapshot();
    const graph = builder.buildFromSnapshot(snapshot);
    const query = new GraphQueryEngine(graph);

    // Q1: What is the main heading?
    const mainHeading = query.findMainHeading();
    assert.equal(mainHeading?.id, "elem_heading");

    // Q2: Which element is the subtitle?
    const subtitles = query.findSubtitles();
    assert.equal(subtitles.length, 1);
    assert.equal(subtitles[0].id, "elem_subtitle");

    // Q3: What elements are aligned with the main heading on the left?
    const leftAligned = query.getAlignedElements("elem_heading", "left");
    const alignedIds = leftAligned.map((r) => r.node.id);
    assert.ok(alignedIds.includes("elem_subtitle"));
    assert.ok(alignedIds.includes("elem_cta_button"));

    // Q4: What elements are near the subtitle?
    const nearSubtitle = query.getElementsNear("elem_subtitle");
    assert.ok(nearSubtitle.length > 0);

    // Q5: Contextual target resolution
    const headingTarget = query.resolveTarget("Make the main heading blue");
    assert.ok(headingTarget.length > 0);
    assert.equal(headingTarget[0].node.id, "elem_heading");
    assert.ok(headingTarget[0].confidence >= 0.8);

    const subtitleTarget = query.resolveTarget("Increase font size of the subtitle");
    assert.ok(subtitleTarget.length > 0);
    assert.equal(subtitleTarget[0].node.id, "elem_subtitle");
  });

  test("6. Graph state hash and staleness detection after external changes", () => {
    const snapshot1 = createMockSnapshot();
    const graph1 = builder.buildFromSnapshot(snapshot1);
    const initialHash = graph1.stateHash;
    assert.ok(initialHash.length > 0);

    const synchronizer = new GraphSynchronizer();

    // No changes -> not stale
    const checkClean = synchronizer.checkStaleness(graph1, snapshot1);
    assert.equal(checkClean.isStale, false);

    // Canvas modified (e.g. element moved or text edited)
    const snapshot2 = createMockSnapshot({
      elements: [
        {
          ...snapshot1.page.elements[0],
          geometry: { ...snapshot1.page.elements[0].geometry, top: 40 }, // Changed top coordinate
        },
        ...snapshot1.page.elements.slice(1),
      ],
    });

    const checkStale = synchronizer.checkStaleness(graph1, snapshot2);
    assert.equal(checkStale.isStale, true);
    assert.notEqual(checkStale.cachedHash, checkStale.currentHash);

    // Reconcile produces fresh graph with new coordinates and updated hash
    const reconciledGraph = synchronizer.reconcile(snapshot2);
    assert.equal(reconciledGraph.getNode("elem_heading")?.geometry.value.top, 40);
    assert.equal(reconciledGraph.stateHash, checkStale.currentHash);
  });
});
