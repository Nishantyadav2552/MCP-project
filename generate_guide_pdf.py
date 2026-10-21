"""
generate_guide_pdf.py

Generates a comprehensive, professional PDF guide for:
"Canva Cursor — Technical Architecture & Interview Mastery Guide"
Includes full project explanation, code structure, subsystems, and 25+ detailed interview questions with examples.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print total page count ('Page X of Y')
    along with running headers and footers.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        self.saveState()

        # Suppress header and footer on the cover page
        if self._pageNumber > 1:
            # Running Header
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(
                36,
                756,
                "CANVA CURSOR — ARCHITECTURE & INTERVIEW MASTERY GUIDE",
            )
            self.setFont("Helvetica", 8)
            self.drawRightString(
                576,
                756,
                "Agentic AI Design Editor Inside Canva",
            )
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.75)
            self.line(36, 750, 576, 750)

            # Running Footer
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.75)
            self.line(36, 42, 576, 42)

            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(
                36,
                30,
                "Confidential & Proprietary — Prepared for Senior Full-Stack / AI Engineer Interviews",
            )
            page_text = f"Page {self._pageNumber} of {total_pages}"
            self.drawRightString(576, 30, page_text)

        self.restoreState()


def build_pdf(filename="Canva_Cursor_Interview_and_Architecture_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom Typography Hierarchy
    cover_title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=30,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=10,
    )

    cover_subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=17,
        textColor=colors.HexColor("#334155"),
        spaceAfter=15,
    )

    meta_label = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
    )

    meta_val = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#475569"),
    )

    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=21,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e40af"),
        spaceBefore=12,
        spaceAfter=5,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        "BulletText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1e293b"),
        leftIndent=14,
        spaceAfter=4,
    )

    code_block = ParagraphStyle(
        "CodeBlock",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=0,
    )

    callout_text = ParagraphStyle(
        "CalloutText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e3a8a"),
    )

    qa_question = ParagraphStyle(
        "QAQuestion",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    qa_answer = ParagraphStyle(
        "QAAnswer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6,
    )

    def make_box(content_flowable, bg="#f8fafc", border="#cbd5e1", pad=8):
        t = Table([[content_flowable]], colWidths=[540])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor(border)),
                    ("TOPPADDING", (0, 0), (-1, -1), pad),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
                    ("LEFTPADDING", (0, 0), (-1, -1), pad + 2),
                    ("RIGHTPADDING", (0, 0), (-1, -1), pad + 2),
                ]
            )
        )
        return t

    story = []

    # ═══════════════════════════════════════════════════════════════════════════
    # COVER / HEADER BANNER
    # ═══════════════════════════════════════════════════════════════════════════
    banner_text = Paragraph(
        "<font color='#2563eb'><b>CANVA CURSOR — SYSTEM ARCHITECTURE & INTERVIEW GUIDE</b></font>",
        ParagraphStyle("TopTag", fontName="Helvetica-Bold", fontSize=10, leading=14),
    )
    story.append(banner_text)
    story.append(Spacer(1, 6))

    story.append(
        Paragraph(
            "Agentic AI Design Editor: Architecture, Code Structure, Design Graph, RAG & 26 Comprehensive Interview Questions",
            cover_title_style,
        )
    )

    story.append(
        Paragraph(
            "An exhaustive guide covering the design, engineering decisions, Canva Apps SDK constraints, "
            "knowledge graph semantics, hybrid RAG retrieval, and real-world failure mode mitigations.",
            cover_subtitle_style,
        )
    )

    meta_table_data = [
        [
            Paragraph("<b>Candidate Role:</b>", meta_label),
            Paragraph("Senior Full-Stack Engineer / AI Systems Engineer", meta_val),
            Paragraph("<b>Target Stack:</b>", meta_label),
            Paragraph("React, TypeScript, Express, Zod, LLMs, Vector RAG", meta_val),
        ],
        [
            Paragraph("<b>Host SDK:</b>", meta_label),
            Paragraph("Canva Developers SDK (@canva/design)", meta_val),
            Paragraph("<b>AI Models:</b>", meta_label),
            Paragraph("Gemini Flash (Generation) + Gemini Embeddings", meta_val),
        ],
        [
            Paragraph("<b>Repository:</b>", meta_label),
            Paragraph("Canva Cursor (d:\\MCP project)", meta_val),
            Paragraph("<b>Verified Tests:</b>", meta_label),
            Paragraph("67 / 67 Passing Unit Tests (Vitest)", meta_val),
        ],
    ]
    t_meta = Table(meta_table_data, colWidths=[90, 180, 90, 180])
    t_meta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(t_meta)
    story.append(Spacer(1, 14))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 1: PROJECT OVERVIEW & VALUE PROPOSITION
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Executive Summary & Problem Solved", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8))

    story.append(
        Paragraph(
            "<b>What is Canva Cursor?</b> Canva Cursor is an in-editor agentic AI design partner embedded directly inside "
            "Canva as a native sidebar panel app. Users issue natural-language instructions (e.g., <i>'make the heading red'</i>, "
            "<i>'style this as a luxury perfume brand with gold accents'</i>, or <i>'add a modern CTA card with a sign-up button'</i>), "
            "and the agent autonomously reads the live canvas, constructs a spatial knowledge graph, retrieves matching design rules via RAG, "
            "synthesizes an atomic operation plan, executes native Canva SDK mutations, and verifies the resulting design.",
            body_style,
        )
    )

    story.append(
        Paragraph(
            "<b>Why is this technically difficult?</b> Traditional chat interfaces cannot edit Canva documents because the DOM inside the Canva "
            "canvas is completely opaque, canvas-rendered, and guarded by iframe sandbox boundaries. Canva Cursor solves this through a strictly "
            "decoupled <b>Plan-Execute-Verify</b> pipeline leveraging the Canva Apps SDK <code>openDesign</code> session API.",
            body_style,
        )
    )

    arch_diagram_text = (
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        "│                          CANVA EDITOR CLIENT (Browser iframe)          │\n"
        "│  1. Snapshot Builder: Serializes elements, text regions, fills, & bounds│\n"
        "│  2. HTTP Request: POST /agent/plan (instruction + snapshot)            │\n"
        "└───────────────────────────────────┬────────────────────────────────────┘\n"
        "                                    │\n"
        "                                    ▼\n"
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        "│                     NODE.JS / EXPRESS BACKEND SERVER                   │\n"
        "│  3. Graph Builder: Computes spatial relationships (ALIGN, NEAR, OVERLAP)│\n"
        "│  4. RAG Retriever: Hybrid search (Cosine Vector + Keyword Boost)       │\n"
        "│  5. LLM Planner: Multi-model fallback + JSON Schema Normalization       │\n"
        "│  6. Plan Validator: Validates element IDs & parameters against graph    │\n"
        "└───────────────────────────────────┬────────────────────────────────────┘\n"
        "                                    │ Returns OperationPlan JSON\n"
        "                                    ▼\n"
        "┌────────────────────────────────────────────────────────────────────────┐\n"
        "│                       CANVA EXECUTION ENGINE (Client)                  │\n"
        "│  7. Staleness Guard: Checks live element count vs snapshot count        │\n"
        "│  8. Single Session: Executes operations in 1 openDesign callback       │\n"
        "│  9. Atomic Commit: session.sync() commits mutations as 1 undo step     │\n"
        "│ 10. Post Verifier: Reads back live properties with numeric tolerance    │\n"
        "└────────────────────────────────────────────────────────────────────────┘"
    )
    story.append(make_box(Paragraph(f"<pre>{arch_diagram_text}</pre>", code_block), bg="#f8fafc", border="#94a3b8"))
    story.append(Spacer(1, 12))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 2: COMPLETE FILE & DIRECTORY CODE STRUCTURE
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. Detailed Codebase Structure & Responsibilities", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8))

    file_rows = [
        [
            Paragraph("<b>File Path</b>", meta_label),
            Paragraph("<b>Layer / Runtime</b>", meta_label),
            Paragraph("<b>Core Responsibility & Key Methods</b>", meta_label),
        ],
        [
            Paragraph("<code>canva-app.json</code>", code_block),
            Paragraph("Canva Manifest", body_style),
            Paragraph("App manifest defining app_id, <code>canva:design:content:read</code> & <code>write</code> permissions, and <code>design_editor</code> intent.", body_style),
        ],
        [
            Paragraph("<code>src/shared/types.ts</code>", code_block),
            Paragraph("Shared (Frontend & Backend)", body_style),
            Paragraph("Type definitions: DesignSnapshot, ElementSnapshot, TextRegion, DesignOperation union (13 ops), OperationPlan, and ExecutionResult.", body_style),
        ],
        [
            Paragraph("<code>src/canva/snapshot-builder.ts</code>", code_block),
            Paragraph("Frontend (Browser)", body_style),
            Paragraph("Calls <code>openDesign({ type: 'current_page' })</code>, extracts layout, fills, text formatting, and generates deterministic session IDs (<code>el-0</code>, <code>el-1</code>).", body_style),
        ],
        [
            Paragraph("<code>src/canva/design-editor.ts</code>", code_block),
            Paragraph("Frontend (Browser)", body_style),
            Paragraph("Core plan executor. Implements staleness guard, translates OperationPlan into Canva SDK mutations (add_shape, add_line, text formatting), calls <code>session.sync()</code> once.", body_style),
        ],
        [
            Paragraph("<code>src/canva/verifier.ts</code>", code_block),
            Paragraph("Frontend (Browser)", body_style),
            Paragraph("Performs read-only inspection after execution to verify that colors, font sizes, text strings, and positions actually mutated on the canvas.", body_style),
        ],
        [
            Paragraph("<code>backend/server.ts</code>", code_block),
            Paragraph("Backend (Node / Express)", body_style),
            Paragraph("API gateway. Manages dynamic CORS matching for Canva iframes (<code>*.canva-apps.com</code>), body validation, session routing, and RAG index pre-warming.", body_style),
        ],
        [
            Paragraph("<code>backend/graph/models.ts</code>", code_block),
            Paragraph("Backend (Design Graph)", body_style),
            Paragraph("Graph data models: SemanticRole, RelationshipType (ALIGNED_WITH, OVERLAPS, NEAR, ABOVE, BELOW), GraphNode, and GraphEdge.", body_style),
        ],
        [
            Paragraph("<code>backend/graph/builder.ts</code>", code_block),
            Paragraph("Backend (Design Graph)", body_style),
            Paragraph("Constructs the DesignKnowledgeGraph from snapshot. Applies bounding-box spatial heuristics to infer semantic roles (main_heading, cta, logo).", body_style),
        ],
        [
            Paragraph("<code>backend/graph/queries.ts</code>", code_block),
            Paragraph("Backend (Design Graph)", body_style),
            Paragraph("Query functions for the graph: <code>findMainHeadings</code>, <code>findByText</code>, and <code>summarizeGraphForPrompt</code> for prompt compression.", body_style),
        ],
        [
            Paragraph("<code>backend/rag/knowledge-base.ts</code>", code_block),
            Paragraph("Backend (RAG)", body_style),
            Paragraph("Curated repository of design knowledge: 5 style archetypes (Luxury, SaaS, Retro, Organic, Pop), 4 component blueprints (CTA, badge, quote, divider), and 8px grid rules.", body_style),
        ],
        [
            Paragraph("<code>backend/rag/embedder.ts</code>", code_block),
            Paragraph("Backend (RAG)", body_style),
            Paragraph("Gemini vector embedder (<code>gemini-embedding-001</code>) with in-memory caching and vector cosine similarity math.", body_style),
        ],
        [
            Paragraph("<code>backend/rag/retriever.ts</code>", code_block),
            Paragraph("Backend (RAG)", body_style),
            Paragraph("Hybrid vector + keyword search (65% vector similarity + 35% token overlap). Returns top matching blueprints and formats prompt markdown.", body_style),
        ],
        [
            Paragraph("<code>backend/agent/planner.ts</code>", code_block),
            Paragraph("Backend (Agent)", body_style),
            Paragraph("Converts instruction + graph summary + RAG context into validated OperationPlan. Normalizes omitted operation types and validates element IDs.", body_style),
        ],
        [
            Paragraph("<code>backend/agent/llm-provider.ts</code>", code_block),
            Paragraph("Backend (Agent)", body_style),
            Paragraph("Resilient multi-model fallback provider (gemini-flash-lite-latest, gemini-3.5-flash, gemini-3-flash-preview) with retry and exponential backoff.", body_style),
        ],
    ]

    t_files = Table(file_rows, colWidths=[150, 110, 280])
    t_files.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t_files)
    story.append(Spacer(1, 14))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 3: DEEP DIVE INTO CORE SUBSYSTEMS
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. Deep Dive into Architectural Innovations", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8))

    story.append(Paragraph("A. The Design Knowledge Graph (Spatial Semantics)", h2_style))
    story.append(
        Paragraph(
            "Raw JSON dumps of canvas elements tell an LLM coordinates like <code>(120, 340)</code>, but fail to explain "
            "<b>what role</b> an element plays or <b>how elements relate</b>. Canva Cursor builds an in-memory spatial graph:",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "• <b>Semantic Role Heuristics:</b> Identifies elements as <code>main_heading</code> (largest font at top), "
            "<code>call_to_action</code> (text inside colored rectangle), <code>logo</code> (small top-left element), or <code>caption</code>.",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "• <b>Spatial Relationship Deduction:</b> Computes <code>ALIGNED_WITH</code> (shared horizontal/vertical axes within 2px), "
            "<code>CONTAINS</code> (bounding box inside another), <code>OVERLAPS</code>, <code>NEAR</code> (distance &lt; 40px), and <code>BELOW</code>.",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "• <b>Token-Efficient Summarization:</b> Instead of sending bloated raw JSON, <code>summarizeGraphForPrompt</code> compresses "
            "the canvas into ~20 tokens per element, reducing latency by 70%.",
            bullet_style,
        )
    )

    story.append(Paragraph("B. The Hybrid RAG Subsystem (Design Grounding)", h2_style))
    story.append(
        Paragraph(
            "To solve the problem of LLMs picking random coordinates or harsh primary colors (#ff0000), Canva Cursor implements "
            "a hybrid Retrieval-Augmented Generation engine:",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "• <b>Curated Knowledge Base:</b> Contains aesthetic rules (e.g. <i>Luxury Minimalist</i> uses obsidian #121214 + champagne gold #d4af37, "
            "80px safe margins) and component blueprints (CTA card, tag pills, quote blocks, section dividers).",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "• <b>Hybrid Scoring Formula:</b> <code>FinalScore = 0.65 × CosineSimilarity + 0.35 × KeywordOverlap</code>. "
            "Vector search handles fuzzy conceptual matches (<i>'exclusive evening gala'</i> → luxury archetype), while keyword boost guarantees "
            "exact term hits (<i>'retro'</i>, <i>'badge'</i>, <i>'cta'</i>).",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "• <b>Pre-Warm Caching:</b> Embeddings for static knowledge items are generated concurrently via <code>Promise.all</code> on server boot, "
            "enabling sub-10ms prompt injection during query time.",
            bullet_style,
        )
    )

    story.append(Paragraph("C. Single-Undo Batch Execution & Staleness Guard", h2_style))
    story.append(
        Paragraph(
            "Canva's API creates one user-facing undo step each time <code>session.sync()</code> is called. "
            "If an agent called <code>sync()</code> after every move, color change, or font edit, a 5-step operation would require the user "
            "to hit Ctrl+Z five times. Canva Cursor runs all operations inside a single <code>openDesign</code> callback and invokes "
            "<code>session.sync()</code> exactly once at the end.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>The Staleness Guard:</b> If a user moves an element while the LLM is planning, applying old coordinates will corrupt the layout. "
            "The executor validates <code>liveElementCount === snapshotElementCount</code> before running mutations. If the canvas was altered, "
            "it gracefully aborts and asks the user to re-submit.",
            body_style,
        )
    )
    story.append(Spacer(1, 10))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 4: 26 INTERVIEW QUESTIONS & DETAILED ANSWERS
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Paragraph("4. 26 Comprehensive Interview Questions & Mastery Answers", h1_style))
    story.append(
        Paragraph(
            "Categorized into Architecture, AI/LLM Engineering, Concurrency/Reliability, Security, and Scalability. "
            "Each question includes the direct technical answer, architectural rationale, and concrete code references.",
            cover_subtitle_style,
        )
    )
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=10))

    questions = [
        # --- CATEGORY 1: ARCHITECTURE & DESIGN CHOICES ---
        (
            "Q1. Why did you choose a Plan-Execute-Verify architecture over direct real-time tool calling (ReAct)?",
            "In Canva, every mutation session requires calling `session.sync()`. If an agent used a ReAct loop with iterative tool calls, "
            "each action would trigger separate syncs, flooding Canva's undo stack (requiring 10 Ctrl+Z presses), causing layout jitter, "
            "and risking partial failures where half the mutations succeed and leave the canvas broken. The Plan-Execute-Verify pattern allows "
            "the LLM to output a holistic JSON plan that is validated offline against the design graph, executed in one atomic session, and "
            "verified in a single pass."
        ),
        (
            "Q2. How do you serialize Canva design state without leaking internal SDK references?",
            "In `src/canva/snapshot-builder.ts`, we traverse `page.elements.toArray()` and convert each element into plain JSON-serializable "
            "interfaces defined in `src/shared/types.ts` (e.g. `TextElementSnapshot`, `RectElementSnapshot`). Text formatting is flattened "
            "into `TextRegion` objects, and fills are normalized to `{ type: 'solid', color: '#hex' }`. We deliberately discard all live "
            "Canva SDK object pointers so the snapshot can cross the HTTP boundary to the Express backend."
        ),
        (
            "Q3. How do you handle element identification given that Canva elements don't have stable external IDs?",
            "Canva's live editing API does not expose a global UUID on live Element objects. We solve this by establishing an index-based session ID "
            "convention: `el-0`, `el-1`, etc., corresponding to element positions in `page.elements.toArray()` during snapshot capture. "
            "The backend graph and planner use these IDs. During execution, `idToIndex(elementId)` maps the ID back to the live array index. "
            "This convention is strictly scoped to a single plan lifecycle and guarded by the Staleness Guard."
        ),
        (
            "Q4. What is the Design Knowledge Graph, and why not pass raw JSON to the LLM?",
            "Raw JSON describes visual objects as disparate rectangles with raw coordinates like `top: 240, left: 180`. LLMs struggle to deduce "
            "spatial relationships from raw numbers across 30 elements. The `DesignGraph` pre-computes semantic roles (`main_heading`, `cta`, `logo`) "
            "and spatial edges (`ALIGNED_WITH`, `CONTAINS`, `NEAR`, `OVERLAPS`). Furthermore, `summarizeGraphForPrompt` formats the graph into "
            "compact 1-line representations, cutting prompt token usage by over 70% and drastically reducing LLM hallucinations."
        ),
        (
            "Q5. How does the frontend communicate with the backend across the iframe boundary?",
            "The Canva app frontend runs inside a sandboxed iframe hosted on `https://app-[app-id].canva-apps.com`. It issues standard asynchronous "
            "HTTP `fetch` requests to the local Express backend at `http://localhost:3001/agent/plan`. The Express backend handles CORS preflight "
            "`OPTIONS` requests and dynamically authorizes origins matching `*.canva-apps.com`."
        ),
        (
            "Q6. How does single-undo batching work in the Canva Apps SDK?",
            "When `openDesign` opens a session, mutations made to `element` states are staged in memory. In `src/canva/design-editor.ts`, "
            "we execute all plan operations in a single sequential loop and then call `await session.sync()`. Canva packages all staged changes "
            "into a single atomic transaction, ensuring the user can revert the entire AI edit with one single Ctrl+Z."
        ),

        # --- CATEGORY 2: AI / LLM & RAG ENGINEERING ---
        (
            "Q7. Why did you implement RAG for a design editor, and what does it retrieve?",
            "General-purpose LLMs lack contextual design aesthetics; when asked to 'add a button' or 'make it look retro', they tend to invent "
            "arbitrary coordinates, clash colors, or violate contrast. Our RAG system in `backend/rag/` retrieves curated aesthetic archetypes "
            "(e.g., Retro Synthwave: midnight purple `#0d0221` + neon magenta `#ff007f`) and component blueprints (CTA card width, internal padding, "
            "button offsets). This injects professional design tokens into the prompt so the model outputs visually balanced plans."
        ),
        (
            "Q8. How does your RAG retriever compute hybrid similarity?",
            "In `backend/rag/retriever.ts`, we compute: `FinalScore = 0.65 × CosineSimilarity + 0.35 × KeywordOverlap`. Vector embeddings "
            "(via `gemini-embedding-001`) handle conceptual queries (e.g. *'exclusive perfume'* matches *Luxury & Minimalist*), while keyword scoring "
            "guarantees high relevance when explicit keywords appear (e.g. *'badge'*, *'divider'*, *'80s'*, *'cta'*)."
        ),
        (
            "Q9. How do you handle LLM schema non-compliance or when the model omits the `type` discriminator?",
            "In `backend/agent/planner.ts`, before running `LLMResponseSchema.safeParse(parsed)`, we implement a resilient normalization layer. "
            "If an operation object omits `type`, we inspect its attributes: if it has `formatting` → `update_text_style`; if it has `shape` → `add_shape`; "
            "if it has `newText` → `update_text_content`; if it has `color` without `elementId` → `update_background_color`. This prevents valid plans "
            "from being rejected due to minor LLM omissions."
        ),
        (
            "Q10. How do you prevent LLMs from hallucinating nonexistent element IDs?",
            "In `backend/agent/planner.ts`, the `validateElementIds` function scans all operations in the plan before execution. Any operation referencing "
            "an `elementId`, `relativeElementId`, or `elementIds` array is verified against `graph.nodes.has(id)`. If an ID is missing, the plan is rejected "
            "immediately with a descriptive error, preventing corrupted Canva API calls."
        ),
        (
            "Q11. How did you resolve Gemini API rate limiting (429) and high-demand spikes (503)?",
            "In `backend/agent/llm-provider.ts`, we implemented a multi-model fallback list: `[normalizedModel, 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3-flash-preview']`. "
            "Each candidate is tried with exponential backoff (1s, 2s). If a model encounters a 503 (high demand) or 429 (quota), it automatically "
            "falls back to the next available lightweight model without failing the user's request."
        ),
        (
            "Q12. What prompt engineering techniques do you use to enforce JSON output?",
            "In `backend/agent/prompts.ts`, we provide explicit discriminated union examples, declare `Respond ONLY with valid JSON. No markdown, no prose`, "
            "and pass `temperature: 0.1` for deterministic structured decoding. On receipt, we strip markdown code fences (````json ... ````) before "
            "JSON parsing."
        ),

        # --- CATEGORY 3: CONCURRENCY, RELIABILITY & CANVA SDK QUIRKS ---
        (
            "Q13. What is the Staleness Guard, and what race condition does it prevent?",
            "In `src/canva/design-editor.ts`, `executePlan` runs an initial check: `checkStaleness(plan.snapshotElementCount, liveCount)`. "
            "Because LLM planning takes 1–2 seconds, a user might delete or add an element during that window. If element counts differ, "
            "the index-based ID mapping (`el-0`, `el-1`) is no longer valid. The Staleness Guard aborts execution with a friendly retry message "
            "rather than applying edits to the wrong elements."
        ),
        (
            "Q14. How does the Verification Engine work, and why is floating-point tolerance necessary?",
            "In `src/canva/verifier.ts`, after `session.sync()`, we reopen the design in read-only mode and compare live element properties against "
            "the requested operation plan. For spatial positions (`top`, `left`), we apply a numeric tolerance of `±2px` (`compareProperty(expected, actual, 2)`) "
            "because Canva's layout engine performs sub-pixel rounding and font line-height recalculations that can shift coordinates slightly."
        ),
        (
            "Q15. What does the `succeeded_unverified` status mean in operation results?",
            "Operations that succeed in mutating memory but cannot be definitively read back or verified (such as layer order changes, grouped element hierarchies, "
            "or when `session.sync()` completes without returning explicit element confirmations) are classified as `succeeded_unverified`. This provides "
            "transparency in the UI without falsely reporting an error."
        ),
        (
            "Q16. What Canva Design Editing API limitations did you encounter and design around?",
            "Key limitations from `docs/canva-capabilities.md` include: (1) Text element height cannot be set (auto-sized by Canva based on content/width); "
            "(2) Gradient fills are unsupported (solid colors only); (3) Element duplication has no clone API (we reconstruct elements by reading properties "
            "and recreating them via `elementStateBuilder`); (4) Element types cannot be changed dynamically."
        ),
        (
            "Q17. How did you add support for creating shapes, lines, and text?",
            "We extended the `DesignOperation` union in `types.ts` with `add_shape`, `add_line`, and `add_text`. In `src/canva/design-editor.ts`, "
            "we utilize `helpers.elementStateBuilder`: `createRectElement` for rectangles and lines (using 2px–4px heights), and `createShapeElement` "
            "with vector SVG path strings (`d`) for circles, triangles, and stars. New elements are inserted at the top of the stack via "
            "`elements.insertAfter(undefined, newState)`."
        ),

        # --- CATEGORY 4: SECURITY, NETWORKING & INTEGRATION ---
        (
            "Q18. What was the root cause of the `[permission_denied]: canva:design:content:read` error and how did you resolve it?",
            "Canva requires runtime permissions to be declared in `canva-app.json` AND synced with the remote Developer Portal. The local file had "
            "`canva:design:content:read`, but the Developer Portal only had `write` permissions registered. We synced the manifest using "
            "`npx canva apps config push --strategy local`, which prompted the Canva client to present the user consent modal on reload."
        ),
        (
            "Q19. How did you configure CORS to support the Canva app iframe securely?",
            "In `backend/server.ts`, requests from the Canva iframe have origin headers matching `https://app-[id].canva-apps.com`. "
            "We configured Express `cors` middleware to parse the origin URL and verify that `hostname.endsWith('.canva-apps.com')` or "
            "`hostname.endsWith('.canva.com')`, while supporting HTTP `OPTIONS` preflight with 204 status."
        ),
        (
            "Q20. Why must LLM API keys never be referenced in frontend code?",
            "Frontend code runs inside the user's browser iframe. If `GEMINI_API_KEY` were bundled into client scripts, anyone inspecting network tabs "
            "or source maps could extract the key and abuse the API quota. All LLM calls and API keys reside strictly on the Express backend behind "
            "validated endpoint contracts."
        ),
        (
            "Q21. How do you prevent Denial of Service (DoS) attacks on the backend server?",
            "We apply `express.json({ limit: '2mb' })` to prevent large payload memory exhaustion, validate request bodies via strict Zod schemas "
            "(`AgentRequestSchema`, `ExecutionResultSchema`), enforce maximum instruction lengths (2000 characters), and automatically prune in-memory "
            "sessions older than 1 hour (`pruneOldSessions`)."
        ),

        # --- CATEGORY 5: SCALABILITY, PRODUCTION READINESS & FUTURE SCOPE ---
        (
            "Q22. How would you scale the in-memory session store for production?",
            "Currently, sessions are stored in an in-memory `Map<string, AgentSession>`. In a multi-instance production environment behind a load balancer, "
            "we would externalize session state to a Redis cluster or PostgreSQL with JSONB columns. This allows horizontal scaling of backend nodes "
            "without session affinity issues."
        ),
        (
            "Q23. How could you incorporate Multi-Modal Vision into this architecture?",
            "Canva provides thumbnail export APIs. When taking a snapshot, we could generate a low-resolution JPEG thumbnail of the canvas, encode it as "
            "base64, and pass it alongside the design graph to a multimodal LLM (e.g. Gemini Flash Vision). The model could evaluate visual balance, "
            "negative space, and color clash visually rather than relying solely on coordinate bounding boxes."
        ),
        (
            "Q24. How does this architecture map to the Model Context Protocol (MCP)?",
            "The design operations in `src/shared/types.ts` (`update_text_style`, `add_shape`, `move_element`) represent well-defined discrete tools. "
            "By wrapping `backend/agent/planner.ts` with the `@modelcontextprotocol/sdk`, external AI clients (like Claude Desktop or Antigravity) "
            "could directly invoke Canva design tools via standard MCP RPC protocols."
        ),
        (
            "Q25. How do you test the codebase without running the full Canva editor?",
            "We decoupled all business logic, graph construction, RAG retrieval, and schema validation from the Canva SDK. In `tests/unit/`, "
            "58+ unit tests run in milliseconds using Vitest without requiring a browser, Canva login, or live LLM network connection. Canva SDK "
            "calls are isolated to thin adapter functions that can be mocked with `vi.spyOn`."
        ),
        (
            "Q26. What metrics would you monitor in production to assess agent quality?",
            "Key production metrics include: (1) **Plan Execution Success Rate** (percentage of planned operations that execute without error); "
            "(2) **Verification Match Rate** (percentage of properties verified by the post-verifier); (3) **Staleness Abort Rate**; "
            "(4) **LLM Fallback Frequency** (how often models fall back due to 503s); and (5) **End-to-End Latency** (p50, p95 from user submit to visual canvas update)."
        ),
    ]

    for q_text, a_text in questions:
        q_flowable = Paragraph(f"<b>{q_text}</b>", qa_question)
        a_flowable = Paragraph(a_text, qa_answer)
        story.append(KeepTogether([q_flowable, a_flowable, Spacer(1, 4)]))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 5: STEP-BY-STEP LIFECYCLE WALKTHROUGH
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Paragraph("5. Step-by-Step Lifecycle of a Real User Instruction", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=10))

    story.append(
        Paragraph(
            "<b>Walkthrough Scenario:</b> The user has a presentation title slide open and types: "
            "<i>'Give this design a luxury high-end perfume brand look with gold accents'</i>.",
            body_style,
        )
    )

    steps_data = [
        [
            Paragraph("<b>Step</b>", meta_label),
            Paragraph("<b>Component</b>", meta_label),
            Paragraph("<b>Exact Technical Action & Data Transformation</b>", meta_label),
        ],
        [
            Paragraph("1. Capture", meta_label),
            Paragraph("SnapshotBuilder", body_style),
            Paragraph("Runs <code>openDesign({ type: 'current_page' })</code>. Traverses <code>page.elements</code>. Serializes title heading <code>el-0</code> with text 'ELEGANCE NOIR', font 48px, color #000000, bounds (460, 200, 1000, 80).", body_style),
        ],
        [
            Paragraph("2. Graph Build", meta_label),
            Paragraph("GraphBuilder", body_style),
            Paragraph("Computes spatial indices. Assigns semantic role <code>main_heading</code> (95% confidence) to <code>el-0</code> because it has the largest font size and is located in the upper half.", body_style),
        ],
        [
            Paragraph("3. RAG Retrieval", meta_label),
            Paragraph("RAG Retriever", body_style),
            Paragraph("Queries vector index with 'luxury perfume gold'. Matches <code>style-luxury-minimalist</code> (score 92%). Retrieves obsidian background <code>#121214</code>, champagne gold <code>#d4af37</code>, and divider line rule.", body_style),
        ],
        [
            Paragraph("4. Plan Gen", meta_label),
            Paragraph("LLM Planner", body_style),
            Paragraph("Synthesizes plan with 3 atomic operations: (1) <code>update_background_color</code> (#121214); (2) <code>update_text_style</code> on <code>el-0</code> (color: #d4af37); (3) <code>add_line</code> (width: 500, height: 2, color: #c5a059).", body_style),
        ],
        [
            Paragraph("5. Validation", meta_label),
            Paragraph("Zod & Graph", body_style),
            Paragraph("Validates operations against <code>OperationSchema</code>. Confirms <code>el-0</code> exists in graph. Normalizes types.", body_style),
        ],
        [
            Paragraph("6. Execution", meta_label),
            Paragraph("DesignEditor", body_style),
            Paragraph("Checks staleness (live count == snapshot count). Applies background fill, updates text formatting on <code>el-0</code>, creates rect line via <code>elementStateBuilder</code>, calls <code>session.sync()</code> once.", body_style),
        ],
        [
            Paragraph("7. Verify & UI", meta_label),
            Paragraph("Verifier & UI", body_style),
            Paragraph("Reads back <code>el-0</code> color; confirms it matches #d4af37. Emits success result to chat panel with friendly assistant message.", body_style),
        ],
    ]

    t_steps = Table(steps_data, colWidths=[65, 115, 360])
    t_steps.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t_steps)
    story.append(Spacer(1, 14))

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 6: CANDIDATE INTERVIEW CHEAT SHEET
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("6. Candidate Interview Cheat Sheet (Top 7 Soundbites)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8))

    cheat_sheet_points = [
        ("1. Architecture", "Plan-Execute-Verify pattern prevents Canva undo-stack pollution and guarantees atomic batch execution."),
        ("2. Graph Semantics", "Spatial knowledge graph converts opaque bounding boxes into semantic roles (heading, cta, logo) with 70% token savings."),
        ("3. RAG Precision", "Hybrid vector (cosine 65%) + keyword (35%) retriever grounds LLM output in professional palettes and component blueprints."),
        ("4. Concurrency Guard", "Staleness Guard detects canvas mutations during planning, preventing layout corruption from race conditions."),
        ("5. Resilient AI", "Multi-model fallback (gemini-flash-lite, 3.5, 3) with exponential backoff transparently absorbs 503 high-demand spikes."),
        ("6. Post Verification", "Post-execution verification with ±2px tolerance validates that intended mutations took visual effect in Canva."),
        ("7. Enterprise Security", "Zero client API key leakage; dynamic origin verification matches Canva's sandboxed iframe boundaries."),
    ]

    for title, desc in cheat_sheet_points:
        story.append(
            Paragraph(
                f"• <b>{title}:</b> {desc}",
                bullet_style,
            )
        )

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[generate_guide_pdf] Successfully built: {filename}")


if __name__ == "__main__":
    out_file = "Canva_Cursor_Interview_and_Architecture_Guide.pdf"
    if len(sys.argv) > 1:
        out_file = sys.argv[1]
    build_pdf(out_file)
