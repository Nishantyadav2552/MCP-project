import { SemanticRole } from "@canva-cursor/shared";
import { ElementNode, PageNode, PropertyWithProvenance } from "../models/node.js";

const CTA_KEYWORDS = [
  "get started",
  "sign up",
  "learn more",
  "buy now",
  "try now",
  "contact us",
  "subscribe",
  "book now",
  "read more",
  "join now",
  "click here",
  "explore",
];

export interface ClassificationResult {
  role: SemanticRole;
  confidence: number;
  rationale: string;
}

export class SemanticRoleClassifier {
  /**
   * Classifies all elements on the page collectively, using relative font size dominance,
   * spatial position, and text keywords.
   */
  public classifyAll(
    page: PageNode,
    elements: Array<{
      id: string;
      type: string;
      top: number;
      left: number;
      width: number;
      height: number;
      zIndex: number;
      text?: string;
      fontSize?: number;
      fontWeight?: string;
      fillColor?: string;
    }>
  ): Map<string, PropertyWithProvenance<SemanticRole>> {
    const results = new Map<string, PropertyWithProvenance<SemanticRole>>();

    // 1. Separate text elements and sort by font size descending
    const textElements = elements
      .filter((el) => el.type === "text")
      .map((el) => ({
        ...el,
        fontSize: el.fontSize || 16,
      }))
      .sort((a, b) => b.fontSize - a.fontSize);

    const maxFontSize = textElements.length > 0 ? textElements[0].fontSize : 16;
    let mainHeadingId: string | null = null;

    // Identify main heading
    for (const el of textElements) {
      const isTopHalf = el.top < page.dimensions.height * 0.65;
      const isDominantSize = el.fontSize >= maxFontSize * 0.85;

      if (!mainHeadingId && isDominantSize && isTopHalf) {
        mainHeadingId = el.id;
        results.set(el.id, {
          value: "heading_main",
          source: "inferred_model",
          confidence: 0.95,
        });
        break;
      }
    }

    // Classify other text elements
    for (const el of textElements) {
      if (el.id === mainHeadingId) continue;

      const textLower = (el.text || "").toLowerCase().trim();

      // Check if CTA button text
      if (CTA_KEYWORDS.some((kw) => textLower.includes(kw)) && textLower.length < 30) {
        results.set(el.id, {
          value: "cta",
          source: "inferred_model",
          confidence: 0.9,
        });
        continue;
      }

      // Check for subtitle: positioned below main heading with medium font size
      if (mainHeadingId) {
        const mainEl = textElements.find((e) => e.id === mainHeadingId);
        if (mainEl && el.top > mainEl.top && el.top < mainEl.top + mainEl.height + 250) {
          if (el.fontSize < mainEl.fontSize && el.fontSize >= 18) {
            results.set(el.id, {
              value: "heading_sub",
              source: "inferred_model",
              confidence: 0.88,
            });
            continue;
          }
        }
      }

      // Check for caption vs body
      if (el.fontSize <= 14) {
        results.set(el.id, {
          value: "caption",
          source: "inferred_model",
          confidence: 0.8,
        });
      } else if (el.fontSize >= 28) {
        results.set(el.id, {
          value: "title",
          source: "inferred_model",
          confidence: 0.75,
        });
      } else {
        results.set(el.id, {
          value: "body",
          source: "inferred_model",
          confidence: 0.85,
        });
      }
    }

    // Classify non-text elements (shapes, rects, embeds)
    const nonTextElements = elements.filter((el) => el.type !== "text");
    for (const el of nonTextElements) {
      const area = el.width * el.height;
      const pageArea = page.dimensions.width * page.dimensions.height;

      // Background element check
      if (area >= pageArea * 0.85 && el.zIndex === 0) {
        results.set(el.id, {
          value: "background",
          source: "inferred_model",
          confidence: 0.98,
        });
        continue;
      }

      // Check for CTA button rectangle
      if (el.type === "rect" || el.type === "shape") {
        if (el.width >= 100 && el.width <= 320 && el.height >= 30 && el.height <= 80) {
          results.set(el.id, {
            value: "cta",
            source: "inferred_model",
            confidence: 0.88,
          });
          continue;
        }

        // Card container check
        if (el.width >= 200 && el.height >= 200) {
          results.set(el.id, {
            value: "card",
            source: "inferred_model",
            confidence: 0.7,
          });
          continue;
        }
      }

      // Default non-text
      results.set(el.id, {
        value: el.type === "embed" ? "image" : "unknown",
        source: "inferred_model",
        confidence: 0.5,
      });
    }

    return results;
  }
}
