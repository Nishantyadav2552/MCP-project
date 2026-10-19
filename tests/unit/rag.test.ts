import { describe, it, expect } from "vitest";
import { cosineSimilarity } from "../../backend/rag/embedder";
import {
  retrieveDesignKnowledge,
  formatRetrievedKnowledgeForPrompt,
  initializeKnowledgeIndex,
} from "../../backend/rag/retriever";

describe("RAG system", () => {
  it("calculates cosine similarity correctly", () => {
    const v1 = [1, 0, 0];
    const v2 = [1, 0, 0];
    const v3 = [0, 1, 0];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0);
    expect(cosineSimilarity(v1, v3)).toBeCloseTo(0.0);
  });

  it("retrieves relevant knowledge items using keyword/hybrid search", async () => {
    await initializeKnowledgeIndex();

    // Query 1: Luxury style
    const luxuryResults = await retrieveDesignKnowledge("Make this look like a luxury brand with gold");
    expect(luxuryResults.length).toBeGreaterThan(0);
    expect(luxuryResults[0].item.id).toBe("style-luxury-minimalist");

    // Query 2: Retro 80s
    const retroResults = await retrieveDesignKnowledge("Change to a retro synthwave neon look");
    expect(retroResults.length).toBeGreaterThan(0);
    expect(retroResults[0].item.id).toBe("style-retro-synthwave");

    // Query 3: CTA Button
    const ctaResults = await retrieveDesignKnowledge("Add a call to action button with banner");
    expect(ctaResults.length).toBeGreaterThan(0);
    expect(ctaResults[0].item.id).toBe("blueprint-cta-section");

    // Test prompt formatting
    const promptSection = formatRetrievedKnowledgeForPrompt(luxuryResults);
    expect(promptSection).toContain("Retrieved Design Knowledge");
    expect(promptSection).toContain("Luxury & High-End Minimalist");
  }, 20000);
});
