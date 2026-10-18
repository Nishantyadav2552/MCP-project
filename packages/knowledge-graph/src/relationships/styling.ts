import { ElementNode } from "../models/node.js";
import { RelationshipEdge } from "../models/edge.js";

/**
 * Computes style similarity and semantic pairing edges between elements.
 */
export function computeStyleAndSemanticRelationships(nodes: ElementNode[]): RelationshipEdge[] {
  const edges: RelationshipEdge[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];

      // 1. Text Style Matching
      if (a.type === "text" && b.type === "text" && a.formatting && b.formatting) {
        const matches: Array<"color" | "fontSize" | "fontFamily" | "fontWeight" | "textAlign"> = [];
        const fmtA = a.formatting.value;
        const fmtB = b.formatting.value;

        if (fmtA.color && fmtB.color && fmtA.color.toLowerCase() === fmtB.color.toLowerCase()) {
          matches.push("color");
        }
        if (fmtA.fontFamily && fmtB.fontFamily && fmtA.fontFamily === fmtB.fontFamily) {
          matches.push("fontFamily");
        }
        if (fmtA.fontSize && fmtB.fontSize && fmtA.fontSize === fmtB.fontSize) {
          matches.push("fontSize");
        }
        if (fmtA.fontWeight && fmtB.fontWeight && fmtA.fontWeight === fmtB.fontWeight) {
          matches.push("fontWeight");
        }
        if (fmtA.textAlign && fmtB.textAlign && fmtA.textAlign === fmtB.textAlign) {
          matches.push("textAlign");
        }

        if (matches.length >= 2) {
          edges.push({
            id: `edge_style_${a.id}_${b.id}`,
            sourceId: a.id,
            targetId: b.id,
            type: "SAME_STYLE_AS",
            provenance: "grounded_geometry",
            metadata: { matchedAttributes: matches },
          });
        }
      }

      // 2. Shape / Fill Color Matching
      if (a.fillColor && b.fillColor && a.fillColor.value.toLowerCase() === b.fillColor.value.toLowerCase()) {
        edges.push({
          id: `edge_style_fill_${a.id}_${b.id}`,
          sourceId: a.id,
          targetId: b.id,
          type: "SAME_STYLE_AS",
          provenance: "grounded_geometry",
          metadata: { matchedAttributes: ["fillColor"] },
        });
      }

      // 3. Semantic Pairing: Heading + Subtitle
      const roleA = a.semanticRole.value;
      const roleB = b.semanticRole.value;

      if (
        (roleA === "heading_main" && roleB === "heading_sub") ||
        (roleA === "heading_sub" && roleB === "heading_main")
      ) {
        edges.push({
          id: `edge_semantic_title_sub_${a.id}_${b.id}`,
          sourceId: a.id,
          targetId: b.id,
          type: "SEMANTICALLY_RELATED_TO",
          provenance: "inferred_semantics",
          metadata: { nature: "title_subtitle_pair" },
        });
      }

      // 4. Semantic Pairing: CTA button box + CTA text
      if (
        (roleA === "cta" && a.type !== "text" && roleB === "cta" && b.type === "text") ||
        (roleB === "cta" && b.type !== "text" && roleA === "cta" && a.type === "text")
      ) {
        edges.push({
          id: `edge_semantic_cta_${a.id}_${b.id}`,
          sourceId: a.id,
          targetId: b.id,
          type: "SEMANTICALLY_RELATED_TO",
          provenance: "inferred_semantics",
          metadata: { nature: "cta_container_text_pair" },
        });
      }
    }
  }

  return edges;
}
