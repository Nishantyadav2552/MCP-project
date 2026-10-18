# Implementation Plan & Milestones

This document tracks progress, milestones, and acceptance criteria for the incremental development of **Canva Cursor**.

---

## Milestone 0: Feasibility & Architectural Blueprint (Completed)
- [x] Inspect repository state and runtime tools (Node.js 24, npm 11, git).
- [x] Analyze official Canva Developers SDK (`@canva/design` v2.13.1) package structure and TypeScript types.
- [x] Unpack `openDesign`, `session.page.elements`, `RichtextRange`, formatting, positioning, and sync mechanics.
- [x] Identify critical constraint: No native element IDs in Canva SDK $\rightarrow$ implement deterministic element handle registry.
- [x] Identify critical constraint: Canva SDK runs in browser iframe $\rightarrow$ design bidirectional Communication Bridge.
- [x] Deliver `architecture.md`, `canva-capabilities.md`, `setup.md`, `implementation-plan.md`.

---

## Milestone 1: Minimal End-to-End Canva Editing Workflow (Phase 1)
**Goal**: Build the smallest functional integration that reads a supported design element, modifies one supported property (e.g. text color / position), synchronizes the change, and confirms the result.
- [ ] Implement `@canva-cursor/shared` (element models, operation schemas).
- [ ] Implement `@canva-cursor/canva-adapter` with dual implementation:
  - In-browser `@canva/design` SDK connector.
  - Testable mock/harness compliant with official Canva SDK contracts.
- [ ] Implement minimal Canva bridge & verify read-modify-sync-verify loop with a real unit/integration test.
- [ ] **Acceptance Criteria**:
  1. Design state with a text heading is loaded.
  2. Element property (e.g. text color or `top` coordinate) is updated.
  3. Change is committed via `session.sync()`.
  4. Post-mutation state is inspected and verified.
  5. Automated test passes without hardcoded mocks.

---

## Milestone 2: Design Knowledge Graph Engine (Phase 2 - Completed)
**Goal**: Graph representation of elements, properties, hierarchy, and spatial relationships.
- [x] Pure TypeScript graph model (`PageNode`, `ElementNode`, `Edge`).
- [x] Relationship extractors: `CONTAINS`, `ALIGNED_WITH` (left, center, top, etc.), `NEAR`, `OVERLAPS`, `ABOVE`, `BELOW`, `SAME_STYLE_AS`, `SEMANTICALLY_RELATED_TO`.
- [x] Semantic role inference: `heading_main`, `heading_sub`, `body`, `caption`, `logo`, `cta`, `card`, `background`.
- [x] Query engine (`findMainHeading()`, `getElementsNear()`, `getAlignedWith()`).
- [x] Graph state hashing & staleness detection.
- [x] **Acceptance Criteria**: Unit tests verify graph construction, spatial calculations, and role resolution. All 6 tests pass.

---

## Milestone 3: Custom MCP Server (Phase 3 - Completed)
**Goal**: Strongly typed MCP tools using `@modelcontextprotocol/sdk`.
- [x] Inspection tools: `get_design_snapshot`, `get_node_details`, `find_main_headings`, `find_elements_by_text`, `query_design_graph`.
- [x] Styling tools: `update_text_style`, `update_fill_color`, `update_font_size`, `update_text_content`, `update_background_color`.
- [x] Layout tools: `move_element`, `align_elements`, `distribute_elements`.
- [x] Structure tools: `delete_element` with mandatory user confirmation guard.
- [x] Verification tools: `verify_element_properties`, `refresh_design_state`, `get_operation_status`.
- [x] **Acceptance Criteria**: Tools validate Zod schemas, execute via adapter, record audit logs, and return structured results. All 7 tests pass.

---

## Milestone 4: Cursor AI Agent & Planner (Phase 4 - Completed)
**Goal**: Convert natural-language instructions into verified, structured operation plans.
- [x] State machine: `IDLE` $\rightarrow$ `QUERYING_GRAPH` $\rightarrow$ `RESOLVING_TARGETS` $\rightarrow$ `GENERATING_PLAN` $\rightarrow$ `VALIDATING_PLAN` $\rightarrow$ `EXECUTING_OPERATIONS` $\rightarrow$ `VERIFYING_RESULTS` $\rightarrow$ `RECONCILING_GRAPH` $\rightarrow$ `COMPLETED`.
- [x] Target resolution with contextual graph reasoning (main heading, subtitle, title, CTA, background, etc.).
- [x] Ambiguity detection & clarification prompt generation when instructions match multiple candidate elements.
- [x] Plan validator enforcing Zod schemas, locked canvas checks, and type compatibility.
- [x] End-to-end composite execution: *"Make the main heading blue and move it to the top of the page"*.
- [x] **Acceptance Criteria**: All 7 integration tests pass.

---

## Milestone 5: Verification, Recovery & Execution History (Phase 5 - Completed)
**Goal**: Robust error handling, safe retries, idempotency, and audit trail.
- [x] Compensating operation (rollback) recorder and endpoint (`POST /api/rollback`).
- [x] Locked element and locked page guards.
- [x] Conflict & staleness detection via `stateHash`.
- [x] WebSocket & HTTP RPC communication bridge (`@canva-cursor/bridge`).
- [x] **Acceptance Criteria**: All 4 bridge and recovery integration tests pass.

---

## Milestone 6: Professional Cursor-Style Frontend UI (Phase 6 - Completed)
**Goal**: State-of-the-art interactive UI.
- [x] Natural-language chat panel with streaming feel, tool badges, and diff views ([ChatPanel.tsx](file:///d:/MCP%20project/apps/web/src/components/ChatPanel.tsx)).
- [x] Live canvas view with interactive element selection & visual bounding boxes ([CanvasView.tsx](file:///d:/MCP%20project/apps/web/src/components/CanvasView.tsx)).
- [x] Live knowledge graph visualizer ([GraphVisualizer.tsx](file:///d:/MCP%20project/apps/web/src/components/GraphVisualizer.tsx)).
- [x] Execution history & tool call inspector ([HistoryPanel.tsx](file:///d:/MCP%20project/apps/web/src/components/HistoryPanel.tsx)).
- [x] Error messages, clarification modals, and retry controls.
- [x] Production build validation with Vite and Tailwind CSS.
- [x] **Acceptance Criteria**: Responsive, functional UI building cleanly.

---

## Milestone 7: Integration Testing & Real Demo Scenarios (Phase 7)
**Goal**: Complete end-to-end multi-step workflow verification.
- [ ] Test composite instructions: "Make the main heading blue and move it to the top of the page."
- [ ] Demonstrate ambiguity resolution and recovery.
- [ ] Comprehensive test suite passing.
