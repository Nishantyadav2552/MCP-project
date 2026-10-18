# Canva Design Editing API — Verified Capability Matrix

Last verified: October 2026 against the Canva Developers SDK documentation.

## Core API

All editing uses `openDesign({ type })` from `@canva/design`.

| Context | Use when |
|---|---|
| `current_page` | Single-page operations (most operations) |
| `all_pages` | Bulk edits across all pages |

Changes are made to a snapshot and applied via `session.sync()` (batch once at end).

## Text Elements

| Operation | API Method | Notes |
|---|---|---|
| Read plain text | `element.text.readPlaintext()` | ✅ |
| Read rich text regions | `element.text.readTextRegions()` | ✅ Regions = uniformly-formatted text runs |
| Change color | `text.replaceText(range, text, { color })` | ✅ Hex, lowercase only |
| Change font size | `text.replaceText(range, text, { fontSize })` | ✅ In pixels (displayed as pt in UI) |
| Change font weight | `text.replaceText(range, text, { fontWeight })` | ✅ "normal" or "bold" |
| Change font style | `text.replaceText(range, text, { fontStyle })` | ✅ "normal" or "italic" |
| Change text align | `text.formatParagraph(range, { textAlign })` | ✅ Paragraph-level only |
| Change text content | `text.replaceText(range, newText)` | ✅ |
| Change font family | Fonts API (`fontRef`) | ⚠️ Separate API, not yet implemented |
| Set line height | N/A | ❌ Not supported |
| Set text element height | N/A | ❌ Auto-sized; cannot set height |

## Rect Elements (shapes, images, videos)

| Operation | API | Notes |
|---|---|---|
| Set solid color fill | `element.fill.colorContainer.set({ type: "solid", color })` | ✅ |
| Set image fill | Upload via `@canva/asset`, then set `mediaContainer` | ✅ Requires asset upload |
| Set video fill | Upload via `@canva/asset`, then set `mediaContainer` | ✅ Requires asset upload |
| Clear fill | `set(undefined)` | ✅ |
| Gradient fill | N/A | ❌ Not yet supported |

## Shape Elements

| Operation | API | Notes |
|---|---|---|
| Set path fill color | `path.fill.colorContainer.set(...)` | ✅ Per-path fills |
| Multiple paths | `element.paths.toArray()` | ✅ |

## All Elements (common properties)

| Property | Read | Write | Notes |
|---|---|---|---|
| `top` | ✅ | ✅ | Absolute px from page top |
| `left` | ✅ | ✅ | Absolute px from page left |
| `width` | ✅ | ✅ | Pixels |
| `height` | ✅ | ✅ (non-text) | Text elements: read-only |
| `rotation` | ✅ | ✅ | Degrees |
| `transparency` | ✅ | ✅ | 0 = opaque, 1 = fully transparent |
| `locked` | ✅ | ❌ | Read-only; must check before editing |
| `type` | ✅ | ❌ | Cannot change element type |

## Page

| Operation | API | Notes |
|---|---|---|
| Read page ID | `page.id` | ✅ |
| Read dimensions | `page.dimensions` | ✅ null = unbounded (whiteboard) |
| Read lock status | `page.locked` | ✅ |
| Set background color | `page.background.colorContainer.set(...)` | ✅ |
| Set background image | `page.background.mediaContainer.set(...)` | ✅ |

## Element Collections

| Operation | Method | Notes |
|---|---|---|
| Add element | `elements.insertAfter(ref, state)` | ✅ |
| Delete element | `elements.delete(el)` | ✅ |
| Move layer up/down | `elements.moveBefore(anchor, el)` / `elements.moveAfter(anchor, el)` | ✅ |
| Group elements | `session.helpers.group({ elements })` | ✅ |
| Ungroup | `session.helpers.ungroup({ element })` | ✅ |
| Duplicate element | No clone API | ⚠️ Must re-create from serialized properties |

## Known Limitations

1. **No gradient fills** — not yet supported in the Design Editing API.
2. **No line-height control** — text line-height is managed by Canva internally.
3. **Text element height is auto** — set width only; height adjusts to content.
4. **No direct element ID access** — element IDs are obtained from `openDesign` sessions; they cannot be looked up independently.
5. **Unsupported pages** — Canva Docs and some other page types are `"unsupported"` and cannot be edited.
6. **One page open at a time** — in `all_pages` context, `openPage` is sequential.
7. **No built-in undo API** — each `session.sync()` call creates one undo step in Canva.
8. **No native duplicate** — element duplication must be implemented by reading properties and creating a new element with the same values.
