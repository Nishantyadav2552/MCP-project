/**
 * snapshot-builder.ts
 *
 * Reads the current page's design state inside an openDesign session and
 * produces a plain JSON-serializable DesignSnapshot that can be sent to the
 * backend agent.
 *
 * IMPORTANT: This module runs in the browser inside the Canva app iframe.
 * It must never import backend-only modules or use Node.js APIs.
 */

import { openDesign, type DesignEditing } from "@canva/design";
import type {
  DesignSnapshot,
  ElementSnapshot,
  TextElementSnapshot,
  RectElementSnapshot,
  ShapeElementSnapshot,
  GroupElementSnapshot,
  EmbedElementSnapshot,
  UnsupportedElementSnapshot,
  SerializedFill,
  TextRegion,
  PageBackground,
} from "../shared/types";

// ─── Fill serialization ───────────────────────────────────────────────────────

function serializeFill(
  colorContainer: DesignEditing.ColorContainer | undefined,
  mediaContainer: DesignEditing.MediaContainer | undefined
): SerializedFill {
  const colorRef = colorContainer?.ref;
  if (colorRef?.type === "solid") {
    return { type: "solid", color: colorRef.color };
  }
  const mediaRef = mediaContainer?.ref;
  if (mediaRef?.type === "image") {
    return { type: "image", imageRef: mediaRef.imageRef };
  }
  if (mediaRef?.type === "video") {
    return { type: "video", videoRef: mediaRef.videoRef };
  }
  return { type: "none" };
}

// ─── Element serialization ────────────────────────────────────────────────────

function serializeTextElement(
  el: DesignEditing.TextElement
): TextElementSnapshot {
  const regions: TextRegion[] = el.text.readTextRegions().map((region) => ({
    text: region.text,
    formatting: {
      fontSize: region.formatting?.fontSize,
      color: region.formatting?.color,
      fontWeight: region.formatting?.fontWeight as TextRegion["formatting"]["fontWeight"],
      fontStyle: region.formatting?.fontStyle as TextRegion["formatting"]["fontStyle"],
      textAlign: region.formatting?.textAlign as TextRegion["formatting"]["textAlign"],
      decoration: region.formatting?.decoration as TextRegion["formatting"]["decoration"],
    },
  }));

  return {
    id: (el as unknown as { id: string }).id ?? "",
    type: "text",
    top: el.top,
    left: el.left,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    transparency: el.transparency ?? 0,
    locked: el.locked,
    plaintext: el.text.readPlaintext(),
    regions,
  };
}

function serializeRectElement(
  el: DesignEditing.RectElement
): RectElementSnapshot {
  return {
    id: (el as unknown as { id: string }).id ?? "",
    type: "rect",
    top: el.top,
    left: el.left,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    transparency: el.transparency ?? 0,
    locked: el.locked,
    fill: serializeFill(el.fill.colorContainer?.ref ? el.fill.colorContainer : undefined, el.fill.mediaContainer?.ref ? el.fill.mediaContainer : undefined),
  };
}

function serializeShapeElement(
  el: DesignEditing.ShapeElement
): ShapeElementSnapshot {
  const firstPath = el.paths.toArray()[0];
  const primaryFill: SerializedFill = firstPath
    ? serializeFill(
        firstPath.fill.colorContainer?.ref ? firstPath.fill.colorContainer : undefined,
        firstPath.fill.mediaContainer?.ref ? firstPath.fill.mediaContainer : undefined
      )
    : { type: "none" };

  return {
    id: (el as unknown as { id: string }).id ?? "",
    type: "shape",
    top: el.top,
    left: el.left,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    transparency: el.transparency ?? 0,
    locked: el.locked,
    primaryFill,
  };
}

function serializeGroupElement(
  el: DesignEditing.GroupElement
): GroupElementSnapshot {
  const childIds: string[] = [];
  el.contents.forEach((child) => {
    const childId = (child as unknown as { id: string }).id;
    if (childId) childIds.push(childId);
  });

  return {
    id: (el as unknown as { id: string }).id ?? "",
    type: "group",
    top: el.top,
    left: el.left,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    transparency: el.transparency ?? 0,
    locked: el.locked,
    childIds,
  };
}

function serializeEmbedElement(
  el: DesignEditing.EmbedElement
): EmbedElementSnapshot {
  return {
    id: (el as unknown as { id: string }).id ?? "",
    type: "embed",
    top: el.top,
    left: el.left,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    transparency: el.transparency ?? 0,
    locked: el.locked,
    url: el.url,
  };
}

function serializeElement(el: DesignEditing.Element): ElementSnapshot {
  if (el.type === "text") return serializeTextElement(el);
  if (el.type === "rect") return serializeRectElement(el);
  if (el.type === "shape") return serializeShapeElement(el);
  if (el.type === "group") return serializeGroupElement(el);
  if (el.type === "embed") return serializeEmbedElement(el);

  // Fallback for unsupported element types
  const unsupported: UnsupportedElementSnapshot = {
    id: (el as unknown as { id: string }).id ?? "",
    type: "unsupported",
    top: el.top,
    left: el.left,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    transparency: (el as unknown as { transparency?: number }).transparency ?? 0,
    locked: el.locked,
  };
  return unsupported;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Opens the current page in read-only mode and builds a DesignSnapshot.
 * This is a full snapshot — call sparingly; use delta updates where possible.
 */
export async function buildCurrentPageSnapshot(): Promise<DesignSnapshot | null> {
  let result: DesignSnapshot | null = null;

  await openDesign({ type: "current_page" }, async (session) => {
    const page = session.page;

    if (page.type === "unsupported") {
      result = {
        pageId: "",
        pageType: "unsupported",
        pageLocked: false,
        dimensions: null,
        background: null,
        elements: [],
        capturedAt: Date.now(),
      };
      return;
    }

    // Serialize background
    let background: PageBackground | null = null;
    if (page.background) {
      background = {
        fill: serializeFill(
          page.background.colorContainer?.ref ? page.background.colorContainer : undefined,
          page.background.mediaContainer?.ref ? page.background.mediaContainer : undefined
        ),
      };
    }

    // Serialize all elements
    const elements: ElementSnapshot[] = page.elements
      .toArray()
      .map(serializeElement);

    result = {
      pageId: page.id,
      pageType: "absolute",
      pageLocked: page.locked,
      dimensions: page.dimensions ?? null,
      background,
      elements,
      capturedAt: Date.now(),
    };
  });

  return result;
}
