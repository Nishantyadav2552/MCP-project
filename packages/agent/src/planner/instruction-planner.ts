import { DesignOperation, ExecutionPlan } from "@canva-cursor/shared";
import { DesignKnowledgeGraph, GraphQueryEngine, ElementNode } from "@canva-cursor/knowledge-graph";
import { resolveColorHex } from "./color-map.js";
import { calculateTargetPosition } from "./position-calculator.js";
import { ClarificationRequest } from "../state-machine/agent-state.js";

export interface PlannerResult {
  plan?: ExecutionPlan;
  clarification?: ClarificationRequest;
  error?: string;
}

export class InstructionPlanner {
  /**
   * Translates a natural language instruction into an ExecutionPlan or ClarificationRequest,
   * grounded directly in the Design Knowledge Graph.
   */
  public plan(instruction: string, graph: DesignKnowledgeGraph): PlannerResult {
    const query = new GraphQueryEngine(graph);
    const lower = instruction.toLowerCase().trim();

    // 1. Check for background color change
    if (lower.includes("background") && (lower.includes("change") || lower.includes("set") || lower.includes("make"))) {
      const color = resolveColorHex(instruction);
      if (color) {
        return {
          plan: {
            planId: `plan_${Date.now()}`,
            userInstruction: instruction,
            rationale: `Change canvas background color to ${color}.`,
            targetElementIds: [graph.pageNode.id],
            operations: [
              {
                type: "update_background_color",
                color,
              },
            ],
            estimatedImpact: "medium",
            requiresConfirmation: false,
          },
        };
      }
    }

    // 2. Check for "Make all headings use the same font" / style unification
    if (lower.includes("all headings") && (lower.includes("same font") || lower.includes("consistent font"))) {
      const mainHeading = query.findMainHeading();
      if (!mainHeading || !mainHeading.formatting?.value.fontFamily) {
        return { error: "Could not find a primary heading with a defined font family to unify against." };
      }

      const allHeadings = [
        ...graph.getNodesByRole("heading_main"),
        ...graph.getNodesByRole("heading_sub"),
        ...graph.getNodesByRole("title"),
      ];

      const targetFont = mainHeading.formatting.value.fontFamily;
      const ops: DesignOperation[] = [];

      for (const h of allHeadings) {
        if (h.id !== mainHeading.id) {
          ops.push({
            type: "update_text_style",
            targetElementId: h.id,
            fontSize: h.formatting?.value.fontSize,
          });
        }
      }

      return {
        plan: {
          planId: `plan_${Date.now()}`,
          userInstruction: instruction,
          rationale: `Unify font family across all headings to match main heading font (${targetFont}).`,
          targetElementIds: allHeadings.map((h) => h.id),
          operations: ops,
          estimatedImpact: "medium",
          requiresConfirmation: false,
        },
      };
    }

    // 3. Check for Alignment: "Align <target> with <reference>"
    const alignMatch = lower.match(/align\s+(?:the\s+)?(.*?)\s+with\s+(?:the\s+)?(.*)/);
    if (alignMatch) {
      const targetPhrase = alignMatch[1].trim();
      const refPhrase = alignMatch[2].trim();

      const targetCandidates = query.resolveTarget(targetPhrase);
      const refCandidates = query.resolveTarget(refPhrase);

      if (targetCandidates.length > 0 && refCandidates.length > 0) {
        const targetEl = targetCandidates[0].node;
        const refEl = refCandidates.find((c) => c.node.id !== targetEl.id)?.node || refCandidates[0].node;

        if (targetEl.id !== refEl.id) {
          return {
            plan: {
              planId: `plan_${Date.now()}`,
              userInstruction: instruction,
              rationale: `Align '${targetEl.semanticRole.value}' with '${refEl.semanticRole.value}' along left edge.`,
              targetElementIds: [targetEl.id],
              operations: [
                {
                  type: "move_element",
                  targetElementId: targetEl.id,
                  position: { left: refEl.geometry.value.left },
                },
              ],
              estimatedImpact: "low",
              requiresConfirmation: false,
            },
          };
        }
      }
    }

    // 4. Resolve Target Elements for general instructions
    const candidates = query.resolveTarget(instruction);

    // Ambiguity Check: Multiple candidates with nearly identical confidence
    if (candidates.length >= 2) {
      const topDiff = Math.abs(candidates[0].confidence - candidates[1].confidence);
      const isGenericHeading = lower.includes("heading") && !lower.includes("main heading") && !lower.includes("sub");
      const multipleSameRole = candidates[0].node.semanticRole.value === candidates[1].node.semanticRole.value;

      if ((topDiff < 0.05 || isGenericHeading || multipleSameRole) && !lower.includes("main heading") && !lower.includes("subtitle") && !lower.includes("title")) {
        return {
          clarification: {
            question: `Multiple elements matched your instruction '${instruction}'. Which one did you mean?`,
            ambiguousTerm: candidates[0].node.semanticRole.value,
            options: candidates.slice(0, 3).map((c, i) => ({
              id: `opt_${i + 1}`,
              label: c.node.text?.value ? `"${c.node.text.value.slice(0, 35)}..."` : `${c.node.type} (${c.node.semanticRole.value})`,
              elementId: c.node.id,
              description: `Position: (top: ${c.node.geometry.value.top}, left: ${c.node.geometry.value.left})`,
            })),
          },
        };
      }
    }

    if (candidates.length === 0) {
      return {
        error: `Could not identify any target element in the design matching '${instruction}'.`,
      };
    }

    const targetNode = candidates[0].node;
    const operations: DesignOperation[] = [];
    const plannedTargetIds = [targetNode.id];

    // 5. Parse Sub-instructions / Intents

    // Intent A: Text / Shape color update
    if (lower.includes("blue") || lower.includes("red") || lower.includes("green") || lower.includes("color") || lower.includes("hex") || lower.includes("black") || lower.includes("white") || lower.includes("beige")) {
      const color = resolveColorHex(instruction);
      if (color) {
        if (targetNode.type === "text") {
          operations.push({
            type: "update_text_color",
            targetElementId: targetNode.id,
            color,
          });
        } else if (targetNode.type === "rect" || targetNode.type === "shape") {
          operations.push({
            type: "update_fill_color",
            targetElementId: targetNode.id,
            fillColor: color,
          });
        }
      }
    }

    // Intent B: Font size update ("Increase the font size of the title to 36")
    const fontSizeMatch =
      lower.match(/(?:font\s*size|size|fontsize).*?\b(\d+)\b/i) ||
      lower.match(/\b(\d+)\b\s*(?:pt|px|points)?\s*(?:font\s*size|size)/i);

    if (fontSizeMatch) {
      const sizeVal = parseInt(fontSizeMatch[1], 10);
      if (sizeVal >= 1 && sizeVal <= 1000) {
        operations.push({
          type: "update_font_size",
          targetElementId: targetNode.id,
          fontSize: sizeVal,
        });
      }
    }

    // Intent C: Spatial Movement
    if (lower.includes("move") || lower.includes("top of the page") || lower.includes("corner") || lower.includes("bottom") || lower.includes("center")) {
      const targetPos = calculateTargetPosition(instruction, targetNode.geometry.value, graph.pageNode);
      if (targetPos) {
        operations.push({
          type: "move_element",
          targetElementId: targetNode.id,
          position: targetPos,
        });
      }
    }

    // Intent D: Deletion ("Delete the...")
    if (lower.startsWith("delete") || lower.startsWith("remove")) {
      operations.push({
        type: "delete_element",
        targetElementId: targetNode.id,
        requireConfirmation: true,
      });
    }

    if (operations.length === 0) {
      return {
        error: `Understood target element '${targetNode.id}' (${targetNode.semanticRole.value}), but could not extract a supported mutation operation from '${instruction}'.`,
      };
    }

    return {
      plan: {
        planId: `plan_${Date.now()}`,
        userInstruction: instruction,
        rationale: `Applied ${operations.length} operation(s) to ${targetNode.semanticRole.value} ('${targetNode.id}').`,
        targetElementIds: plannedTargetIds,
        operations,
        estimatedImpact: operations.some((o) => o.type === "delete_element") ? "high" : "low",
        requiresConfirmation: operations.some((o) => o.type === "delete_element"),
      },
    };
  }
}
