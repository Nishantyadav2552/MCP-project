/**
 * snapshot-builder.ts
 *
 * Reads the current page's design state inside an openDesign session and
 * produces a plain JSON-serializable DesignSnapshot to send to the backend.
 *
 * Runs in the browser inside the Canva app iframe.
 * Must not import backend-only modules or use Node.js APIs.
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

function serializeFill(fill: DesignEditing.Fill | undefined): SerializedFill {
  if (!fill) return { type: "none" };

  const colorRef = fill.colorContainer?.ref;
  if (colorRef?.type === "solid") {
    return { type: "solid", color: colorRef.color };
  }

  const mediaRef = fill.mediaContainer?.ref;
  if (mediaRef?.type === "image") {
    return { type: "image", imageRef: mediaRef.imageRef };
  }
  if (mediaRef?.type === "video") {
    return { type: "video", videoRef: mediaRef.videoRef };
  }

  return { type: "none" };
}

// ─── Unique element IDs ───────────────────────────────────────────────────────
// The Design Editing API doesn't expose a stable string ID on Element objects.
// We assign indices as stable IDs within a single snapshot session.
// These IDs are used to correlate plan operations back to live elements during
// the same openDesign callback — they are NOT persistent across sessions.

function makeElementId(index: number): string {
  return `el-${index}`;
}

// ─── Element serialization ────────────────────────────────────────────────────

function serializeTextElement(
  el: DesignEditing.TextElement,
  id: string
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
    id,
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
  el: DesignEditing.RectElement,
  id: string
): RectElementSnapshot {
  return {
    id,
    type: "rect",
    top: el.top,
    left: el.left,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    transparency: el.transparency ?? 0,
    locked: el.locked,
    fill: serializeFill(el.fill),
  };
}

function serializeShapeElement(
  el: DesignEditing.ShapeElement,
  id: string
): ShapeElementSnapshot {
  const firstPath = el.paths.toArray()[0];
  const primaryFill: SerializedFill = firstPath
    ? (() => {
        const colorRef = firstPath.fill.colorContainer?.ref;
        if (colorRef?.type === "solid") return { type: "solid" as const, color: colorRef.color };
        return { type: "none" as const };
      })()
    : { type: "none" };

  return {
    id,
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
  el: DesignEditing.GroupElement,
  id: string,
  indexOffset: number
): GroupElementSnapshot {
  // Group children are indexed relative to their position in the contents list
  const childIds: string[] = [];
  el.contents.toArray().forEach((_child, i) => {
    childIds.push(makeElementId(indexOffset + i));
  });

  return {
    id,
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
  el: DesignEditing.EmbedElement,
  id: string
): EmbedElementSnapshot {
  return {
    id,
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

function serializeElement(
  el: DesignEditing.AbsoluteElement,
  index: number
): ElementSnapshot {
  const id = makeElementId(index);

  switch (el.type) {
    case "text":
      return serializeTextElement(el, id);
    case "rect":
      return serializeRectElement(el, id);
    case "shape":
      return serializeShapeElement(el, id);
    case "group":
      return serializeGroupElement(el, id, index + 1);
    case "embed":
      return serializeEmbedElement(el, id);
    default: {
      // UnsupportedElement
      const unsupported: UnsupportedElementSnapshot = {
        id,
        type: "unsupported",
        top: el.top,
        left: el.left,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        transparency: el.transparency ?? 0,
        locked: el.locked,
      };
      return unsupported;
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Opens the current page and builds a DesignSnapshot.
 *
 * IMPORTANT: The element IDs in this snapshot are index-based (el-0, el-1…)
 * and are only valid for the duration of the same canva apps start session.
 * The plan executor uses these same IDs to look up elements by index when
 * executing operations in a subsequent openDesign call.
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

    const background: PageBackground | null = page.background
      ? { fill: serializeFill(page.background) }
      : null;

    const allElements = page.elements.toArray();
    const elements: ElementSnapshot[] = allElements.map((el, i) =>
      serializeElement(el, i)
    );

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
