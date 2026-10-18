import {
  DesignSnapshot,
  DesignOperation,
  OperationResult,
  ElementSnapshot,
  PageSnapshot,
} from "@canva-cursor/shared";
import { ICanvaAdapter, VerificationResult } from "./interfaces.js";
import { ElementHandleRegistry } from "./handle-registry.js";

// Note: In browser runtime inside Canva app, @canva/design is imported dynamically
// or globally to avoid failing when executed outside an active Canva iframe.
let canvaDesignSdk: typeof import("@canva/design") | null = null;

async function loadCanvaDesignSdk(): Promise<typeof import("@canva/design")> {
  if (!canvaDesignSdk) {
    try {
      canvaDesignSdk = await import("@canva/design");
    } catch {
      throw new Error(
        "Cannot load @canva/design SDK. Make sure this adapter runs inside the Canva App browser environment."
      );
    }
  }
  return canvaDesignSdk;
}

/**
 * Canva SDK Adapter that interacts directly with Canva's in-editor Design Editing API.
 */
export class CanvaSDKAdapter implements ICanvaAdapter {
  public readonly adapterType = "canva_sdk";
  private registry = new ElementHandleRegistry();

  public async getSnapshot(): Promise<DesignSnapshot> {
    const sdk = await loadCanvaDesignSdk();
    this.registry.clear();

    let pageSnapshot: PageSnapshot | null = null;

    await sdk.openDesign({ type: "current_page" }, async (session) => {
      const page = session.page;
      if (page.type !== "absolute") {
        throw new Error(`Unsupported Canva page type: ${page.type}. Only 'absolute' pages are supported.`);
      }

      const elementsList = page.elements.toArray();
      const elementSnapshots: ElementSnapshot[] = [];

      for (let i = 0; i < elementsList.length; i++) {
        const el = elementsList[i];
        let textContent: string | undefined;

        if (el.type === "text") {
          // In Canva SDK, text elements store content in RichtextRange or children array
          const rawText = (el as unknown as { children?: string[]; text?: unknown }).children;
          textContent = Array.isArray(rawText) ? rawText.join("") : undefined;
        }

        const handleId = this.registry.getOrCreateHandleId(el, {
          pageId: page.id,
          zIndex: i,
          type: el.type,
          top: el.top,
          left: el.left,
          textSnippet: textContent,
        });

        elementSnapshots.push({
          id: handleId,
          type: el.type,
          geometry: {
            top: el.top,
            left: el.left,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            transparency: el.transparency,
          },
          locked: el.locked,
          zIndex: i,
          text: textContent,
        });
      }

      pageSnapshot = {
        id: page.id,
        type: "absolute",
        dimensions: page.dimensions ? { width: page.dimensions.width, height: page.dimensions.height } : { width: 1920, height: 1080 },
        locked: page.locked,
        elements: elementSnapshots,
      };
    });

    if (!pageSnapshot) {
      throw new Error("Failed to read Canva page snapshot.");
    }

    return {
      designId: "canva_active_design",
      page: pageSnapshot,
      version: `v_${Date.now()}`,
      timestamp: Date.now(),
    };
  }

  public async applyOperation(op: DesignOperation): Promise<OperationResult> {
    const sdk = await loadCanvaDesignSdk();
    const opId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    let success = false;
    let error: string | undefined;
    let previousValue: Record<string, unknown> | undefined;
    let newValue: Record<string, unknown> | undefined;

    try {
      await sdk.openDesign({ type: "current_page" }, async (session) => {
        const page = session.page;
        if (page.type !== "absolute") {
          throw new Error("Only absolute pages are supported for design edits.");
        }

        if (page.locked) {
          throw new Error("Page is locked. Modifications are disabled.");
        }

        if (op.type === "update_background_color") {
          await sdk.setCurrentPageBackground({ color: op.color });
          newValue = { backgroundColor: op.color };
          await session.sync();
          success = true;
          return;
        }

        const targetEl = this.registry.getRef<{
          top: number;
          left: number;
          locked: boolean;
          type: string;
          text?: {
            formatText(bounds: { index: number; length: number }, formatting: { color?: string }): void;
            formatParagraph(bounds: { index: number; length: number }, formatting: { fontSize?: number }): void;
          };
        }>(op.targetElementId);

        if (!targetEl) {
          throw new Error(`Target element '${op.targetElementId}' not found in active session.`);
        }

        if (targetEl.locked) {
          throw new Error(`Target element '${op.targetElementId}' is locked.`);
        }

        switch (op.type) {
          case "move_element": {
            previousValue = { top: targetEl.top, left: targetEl.left };
            if (op.position.top !== undefined) targetEl.top = op.position.top;
            if (op.position.left !== undefined) targetEl.left = op.position.left;
            newValue = { top: targetEl.top, left: targetEl.left };
            break;
          }

          case "update_text_color": {
            if (targetEl.type !== "text" || !targetEl.text) {
              throw new Error("Element is not a text element.");
            }
            // Format whole text range
            targetEl.text.formatText({ index: 0, length: 1000 }, { color: op.color });
            newValue = { color: op.color };
            break;
          }

          case "update_font_size": {
            if (targetEl.type !== "text" || !targetEl.text) {
              throw new Error("Element is not a text element.");
            }
            targetEl.text.formatParagraph({ index: 0, length: 1000 }, { fontSize: op.fontSize });
            newValue = { fontSize: op.fontSize };
            break;
          }

          default:
            throw new Error(`Operation type '${op.type}' not yet implemented in live SDK adapter.`);
        }

        // Commit changes to live Canva canvas
        await session.sync();
        success = true;
      });
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
    }

    return {
      operationId: opId,
      operation: op,
      success,
      timestamp: now,
      targetElementId: "targetElementId" in op ? op.targetElementId : undefined,
      previousValue,
      newValue,
      verified: success,
      error,
    };
  }

  public async applyBatch(ops: DesignOperation[]): Promise<OperationResult[]> {
    const results: OperationResult[] = [];
    for (const op of ops) {
      const res = await this.applyOperation(op);
      results.push(res);
      if (!res.success) break;
    }
    return results;
  }

  public async verifyElement(
    elementId: string,
    expectedProperties: Partial<ElementSnapshot>
  ): Promise<VerificationResult> {
    const snapshot = await this.getSnapshot();
    const element = snapshot.page.elements.find((el) => el.id === elementId);

    if (!element) {
      return {
        verified: false,
        elementId,
        actual: null,
        message: `Element '${elementId}' not found.`,
      };
    }

    let verified = true;
    const diff: Record<string, { expected: unknown; actual: unknown }> = {};

    if (expectedProperties.geometry) {
      if (
        expectedProperties.geometry.top !== undefined &&
        element.geometry.top !== expectedProperties.geometry.top
      ) {
        verified = false;
        diff["geometry.top"] = {
          expected: expectedProperties.geometry.top,
          actual: element.geometry.top,
        };
      }
      if (
        expectedProperties.geometry.left !== undefined &&
        element.geometry.left !== expectedProperties.geometry.left
      ) {
        verified = false;
        diff["geometry.left"] = {
          expected: expectedProperties.geometry.left,
          actual: element.geometry.left,
        };
      }
    }

    return {
      verified,
      elementId,
      actual: element,
      diff: verified ? undefined : diff,
    };
  }

  public async refresh(): Promise<void> {
    this.registry.clear();
  }
}
