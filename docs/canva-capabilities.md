# Canva Capability Matrix — Verified APIs & Integration Realities

This capability matrix documents the exact operational feasibility of Canva Cursor operations against the official Canva Developers SDK (`@canva/design` v2.13.1) and Connect APIs.

---

## 1. Capability Matrix

| Operation Category | Target Operation | Canva API Method / Interface | Feasibility Status | Known Constraints & Handling |
| :--- | :--- | :--- | :--- | :--- |
| **Inspection** | Read Page Dimensions & Metadata | `session.page.dimensions`, `session.page.id`, `getCurrentPageMetadata()` | **Verified Supported** | Only absolute pages have fixed dimensions. Whiteboards have undefined dimensions. |
| **Inspection** | Inspect Page Elements | `session.page.elements.toArray()` | **Verified Supported** | Elements are in z-index render order. Type narrowing via `element.type` (`text`, `shape`, `rect`, `group`, `embed`). |
| **Inspection** | Stable Element IDs | Adapter Handle Registry (`elem_<type>_<index>_<hash>`) | **Architected Solution** | `@canva/design` does **not** expose public IDs on elements. The adapter assigns deterministic stable IDs and maintains references in session. |
| **Inspection** | Read Text Content | `textElement.text` (`RichtextRange`) | **Verified Supported** | Canva uses rich text ranges. In pure text elements, content is stored in ranges; adapter reads text buffer or children. |
| **Inspection** | Read Design Colors | `getDesignColors()`, `getBrandKitColors()` | **Verified Supported** | Returns document color palette tokens. |
| **Styling** | Update Text Color | `textElement.text.formatText(bounds, { color: hex })` | **Verified Supported** | Hex color string must include `#` and 6 digits (`#RRGGBB`). Requires `openDesign` session and `session.sync()`. |
| **Styling** | Update Font Size | `textElement.text.formatParagraph(bounds, { fontSize: pts })` | **Verified Supported** | Font size is specified in points (1 to 1000). Applied per paragraph or span. |
| **Styling** | Update Font Weight / Style | `textElement.text.formatText(bounds, { fontWeight, fontStyle })` | **Verified Supported** | Supports `'normal' \| 'bold'`, `'normal' \| 'italic'`. |
| **Styling** | Update Text Alignment | `textElement.text.formatParagraph(bounds, { textAlign })` | **Verified Supported** | Supports `'start' \| 'center' \| 'end' \| 'justify'`. |
| **Styling** | Update Fill Color (Shapes/Rects) | `element.fill = { type: 'color', color: hex }` or element rebuild | **Verified Supported** | On shapes/rects with solid color fills. |
| **Styling** | Update Background Color | `setCurrentPageBackground({ color: hex })` | **Verified Supported** | Native dedicated SDK function. |
| **Layout** | Move Element (`top`, `left`) | `element.top = val; element.left = val;` | **Verified Supported** | Coordinates in container pixels (-32768 to 32767). Re-sync via `session.sync()`. |
| **Layout** | Rotate Element | `element.rotation = degrees;` | **Verified Supported** | Range: -180 to 180 degrees. |
| **Layout** | Transparency / Opacity | `element.transparency = percent;` | **Verified Supported** | Range: 0.0 to 1.0. |
| **Layout** | Resize Element | `element.width = val; element.height = val;` | **Partially Constrained** | `width` and `height` are read-only on certain element interfaces (e.g. text elements where box is auto-calculated from content/fontSize). Replaced or scaled where applicable. |
| **Structure** | Delete Element | `session.page.elements.delete(element)` | **Verified Supported** | Destructive operation. Requires user confirmation or explicit safety checkpoint. |
| **Structure** | Reorder / Layering | `elements.moveBefore(ref, item)`, `elements.moveAfter(ref, item)` | **Verified Supported** | Modifies z-index layering order. |
| **Structure** | Insert New Element | `elements.insertBefore(...)`, `elements.insertAfter(...)`, `addElementAtPoint(...)` | **Verified Supported** | Native SDK insertion methods. |
| **Persistence** | Commit Changes | `await session.sync();` | **Verified Supported** | Must be called before `openDesign` callback resolves. |
| **Verification** | Read-Back Verification | Post-sync element inspection in session | **Verified Supported** | Inspect element properties after sync to verify change took effect. |

---

## 2. Technical Limitations & Defenses

1. **Browser Sandboxing Limitation**:
   - *Issue*: `@canva/design` cannot be executed directly from Node.js command-line processes or server workers because it requires Canva editor iframe message channels.
   - *Resolution*: Our dedicated **Canva Bridge Protocol** bridges the Node.js MCP server and Agent to the browser-side Canva App via an authenticated WebSocket/HTTP RPC endpoint.
2. **Missing Element IDs in Canva SDK**:
   - *Issue*: Elements in `@canva/design` don't have permanent GUIDs.
   - *Resolution*: The adapter implements a deterministic fingerprinting algorithm:
     $$\text{ID} = \text{type} + \text{":z" + index} + \text{":pos(" + top + "," + left + ")"} + \text{":hash(" + content + ")"}$$
     This ensures stable referencing during multi-step planning and rollback tracking.
3. **Locked Page / Locked Elements**:
   - *Issue*: If `session.page.locked === true` or `element.locked === true`, any mutation attempt throws an error in Canva.
   - *Resolution*: Knowledge graph marks nodes with `locked: boolean`. The planner rejects edits to locked elements early before sending tool calls, with an informative user-facing explanation.
4. **Unsupported Page Types**:
   - *Issue*: `openDesign` only supports `session.page.type === "absolute"`. Flow-based documents (Canva Docs) or Whiteboards have `Unsupported` or variable geometry.
   - *Resolution*: The adapter checks `session.page.type === "absolute"` before executing geometric transformations and returns clean fallback messages.
