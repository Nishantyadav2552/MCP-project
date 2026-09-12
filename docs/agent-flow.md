# Agent Lifecycle & Execution Flow

This document details the end-to-end lifecycle of a natural language design request through the Canva AI Design Agent.

---

## 1. Step-by-Step Lifecycle

```text
  User Input ("Create a coffee poster with heading 'Fresh Coffee Every Morning'")
        │
        ▼
  [1] Context Capture
      Frontend captures current canvas dimensions, elements, background, and selection.
        │
        ▼
  [2] Intent & Plan Generation (Planner Agent)
      - Inspects design context and user prompt.
      - Decomposes into ordered TaskItem objects.
      - Enforces allowed Canva actions only.
      - Emits strongly typed Pydantic Plan.
        │
        ▼
  [3] Plan Validation
      - Validates plan structure and action allowlist.
      - Checks for unsupported capabilities.
        │
        ▼
  [4] Task Dispatch & Argument Resolution (Execution Agent)
      - Iterates sequentially through tasks: Task 1 -> Task 2 -> Task 3.
      - Resolves semantic references ("heading" -> element_id).
      - Validates arguments against registered tool schemas.
        │
        ▼
  [5] Tool Execution (Canva Tools / MCP Layer)
      - Invokes registered tool (e.g., create_text, add_shape, set_background).
      - Mutates design context and produces structured ToolResult.
        │
        ▼
  [6] State Update (StateManager)
      - Records turn history, updated element IDs, and execution metrics.
        │
        ▼
  [7] Frontend Synchronisation & Rendering
      - Updates UI with task status tree (✓, ⟳, ✗).
      - Renders updated elements in the Canva Canvas Simulator / Canva Native Editor.
```

---

## 2. Multi-Turn Context Resolution Example

### Turn 1: Initial Creation
**User**: *"Create an Instagram post for a coffee shop with heading 'Fresh Coffee Every Morning'"*
- **Planner**: Generates 5 tasks (`set_background`, `create_text` for heading, `add_image` for coffee hero visual, `add_shape` for CTA pill, `create_text` for CTA label).
- **Executor**: Executes all 5 tasks sequentially.
- **StateManager**: Maps `"heading"` -> `el_text_a1b2`, `"cta"` -> `el_shape_c3d4`.

### Turn 2: Follow-up Modification
**User**: *"Make the heading larger and move it to the center"*
- **Planner**: Inspects Design Context and maps the request to target the existing element `el_text_a1b2`.
- **Tasks**:
  1. `style_text` with `element_id="el_text_a1b2"`, `fontSize=68`
  2. `move_element` with `element_id="el_text_a1b2"`, `placement="center"`
- **Executor**: Updates `el_text_a1b2` in-place without rebuilding the whole canvas or creating duplicate headings.

---

## 3. Unsupported Request Handling

**User**: *"Sculpt a 3D animated mesh for my logo"*
- **Planner**: Identifies that 3D mesh sculpting is not a 2D Canva SDK capability.
- **Result**:
  ```json
  {
    "goal": "Sculpt a 3D animated mesh",
    "is_supported": false,
    "unsupported_reason": "This operation is not currently supported by the available Canva API.",
    "suggested_alternatives": [
      "Add a 2D vector graphic badge",
      "Upload a high-resolution logo image asset",
      "Apply styled Canva layout templates"
    ],
    "tasks": []
  }
  ```
- **Execution Agent**: Skips execution safely and returns the explanation and suggestions directly to the chat interface.
