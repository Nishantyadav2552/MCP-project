import { DesignOperation, DesignOperationSchema, ExecutionPlan } from "@canva-cursor/shared";
import { DesignKnowledgeGraph } from "@canva-cursor/knowledge-graph";

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  validatedPlan?: ExecutionPlan;
}

export class PlanValidator {
  public validatePlan(plan: ExecutionPlan, graph: DesignKnowledgeGraph): PlanValidationResult {
    const errors: string[] = [];

    // 1. Check if page is locked
    if (graph.pageNode.locked) {
      errors.push("The page is locked. Modifications to elements on locked pages are prohibited by Canva.");
    }

    // 2. Validate each operation against Zod schema and canvas constraints
    for (let i = 0; i < plan.operations.length; i++) {
      const op = plan.operations[i];

      // Zod schema check
      const parseResult = DesignOperationSchema.safeParse(op);
      if (!parseResult.success) {
        errors.push(`Operation #${i + 1} (${op.type}) failed schema validation: ${parseResult.error.message}`);
        continue;
      }

      // Check target element existence and locked status
      if ("targetElementId" in op) {
        const node = graph.getNode(op.targetElementId);
        if (!node) {
          errors.push(`Operation #${i + 1} references non-existent element '${op.targetElementId}'.`);
          continue;
        }

        if (node.locked.value) {
          errors.push(`Target element '${op.targetElementId}' (${node.semanticRole.value}) is locked and cannot be edited.`);
        }

        // Element type compatibility checks
        if (op.type === "update_text_color" || op.type === "update_font_size" || op.type === "update_text_content" || op.type === "update_text_style") {
          if (node.type !== "text") {
            errors.push(`Cannot apply text styling operation '${op.type}' to an element of type '${node.type}'.`);
          }
        }

        if (op.type === "update_fill_color") {
          if (node.type !== "shape" && node.type !== "rect") {
            errors.push(`Cannot update fill color on element of type '${node.type}'.`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      validatedPlan: errors.length === 0 ? plan : undefined,
    };
  }
}
