/**
 * rag/knowledge-base.ts
 *
 * Curated repository of graphic design knowledge, style archetypes,
 * color harmonies, typography scales, and component blueprints.
 */

import type { DesignKnowledgeItem } from "./types";

export const DESIGN_KNOWLEDGE_BASE: DesignKnowledgeItem[] = [
  // ─── Style Archetypes ────────────────────────────────────────────────────────
  {
    id: "style-luxury-minimalist",
    title: "Luxury & High-End Minimalist",
    category: "style_archetype",
    keywords: ["luxury", "premium", "elegant", "gold", "noir", "high-end", "perfume", "fashion", "jewelry", "minimalist"],
    summary: "Refined, spacious aesthetic with deep noir/charcoal, warm gold/champagne accents, and ample whitespace.",
    content: `Aesthetic: Luxury & High-End Minimalist.
- Palette:
  * Dominant / Background: "#121214" (obsidian) or "#fbfbfa" (alabaster / warm cream)
  * Secondary / Cards: "#1c1c20" (deep graphite) or "#f0efe9"
  * Accents / Highlights: "#d4af37" (champagne gold) or "#c5a059" (burnished brass)
  * Primary Text: "#ffffff" on dark, or "#1a1a1a" on light
  * Subdued Text: "#a1a1aa" or "#71717a"
- Typography & Hierarchy:
  * Main Heading: 40px–54px, bold or elegant, generous letter spacing
  * Subtitle / Tagline: 16px–20px, uppercase, lighter weight
  * Body: 14px–16px, regular
- Layout Rules:
  * Generous margins (at least 80px–120px from page edges)
  * Symmetrical center alignment or deliberate strong left alignment
  * Keep visual elements sparse; let negative space breathe.`,
  },
  {
    id: "style-modern-saas-tech",
    title: "Modern Tech & SaaS Clean",
    category: "style_archetype",
    keywords: ["saas", "tech", "modern", "software", "clean", "app", "startup", "blue", "indigo", "digital"],
    summary: "Clean, crisp digital product look with slate neutrals, vibrant electric blue/indigo accents, and card containers.",
    content: `Aesthetic: Modern Tech & SaaS Clean.
- Palette:
  * Dominant / Canvas: "#ffffff" or "#0f172a" (slate dark)
  * Secondary / Cards: "#f8fafc" (cool light slate) or "#1e293b" (slate 800)
  * Primary Accent / Buttons: "#2563eb" (electric royal blue) or "#6366f1" (indigo)
  * Supporting Accents: "#06b6d4" (cyan) or "#10b981" (emerald green)
  * Primary Text: "#0f172a" on light, "#f8fafc" on dark
  * Muted Text: "#64748b" (slate 500)
- Typography:
  * Headings: 36px–48px, bold, tight line-height
  * Body: 14px–16px, regular
  * Badges / Metadata: 12px–13px, semibold
- Layout Rules:
  * Strict 8px grid (8, 16, 24, 32, 48px paddings)
  * Content organized in elevated cards with 16px–24px internal padding
  * Clear hierarchy: Badge -> Heading -> Value Proposition -> CTA Button.`,
  },
  {
    id: "style-retro-synthwave",
    title: "Retro 80s Synthwave & Cyberpunk",
    category: "style_archetype",
    keywords: ["retro", "80s", "synthwave", "cyberpunk", "neon", "vintage", "glow", "vaporwave", "futuristic"],
    summary: "High-voltage nostalgic design with midnight purple backgrounds, neon magenta, cyan, and vibrant yellow.",
    content: `Aesthetic: Retro 80s Synthwave / Cyberpunk.
- Palette:
  * Dominant Background: "#0d0221" (deep space void) or "#1a0b2e" (midnight violet)
  * Vibrant Neon Accent 1: "#ff007f" (neon magenta / hot pink)
  * Vibrant Neon Accent 2: "#00f0ff" (electric cyan)
  * Accent 3: "#ffe600" (laser yellow)
  * Text: "#ffffff" or "#00f0ff" with bold high-contrast strokes
- Typography:
  * Headings: 44px–60px, bold or italicized, high energy
  * Subheadings: 18px–24px, uppercase
- Layout Rules:
  * Horizontal laser line dividers (e.g. 3px–6px height in neon magenta/cyan)
  * Geometric shapes (triangles, wireframe sun circles, grids)
  * High-contrast foreground elements against dark cosmic backdrop.`,
  },
  {
    id: "style-warm-organic-bakery",
    title: "Warm Organic, Artisan & Cafe",
    category: "style_archetype",
    keywords: ["organic", "warm", "bakery", "cafe", "coffee", "artisan", "nature", "earthy", "terracotta", "handmade"],
    summary: "Inviting, cozy, earthy palette with oat creams, rich terracotta, olive green, and warm espresso brown.",
    content: `Aesthetic: Warm Organic, Artisan & Cafe.
- Palette:
  * Dominant Background: "#faf7f2" (warm oat milk) or "#f5ede3" (parchment)
  * Secondary / Surfaces: "#e8ded2" (almond cream)
  * Earthy Accent 1: "#c86446" (terracotta / rust)
  * Earthy Accent 2: "#5c6b53" (sage / olive green)
  * Text Primary: "#2c2420" (deep espresso)
  * Text Secondary: "#73645b" (warm taupe)
- Typography:
  * Headings: 38px–50px, warm, friendly
  * Body: 14px–16px, readable
- Layout Rules:
  * Soft geometric shapes (circular badges, curved cards)
  * Gentle, grounded spacing with natural balanced breathing room.`,
  },
  {
    id: "style-playful-modern-pop",
    title: "Playful Modern Pop & Vibrant",
    category: "style_archetype",
    keywords: ["playful", "fun", "pop", "creative", "vibrant", "kids", "colorful", "youth", "modern"],
    summary: "Optimistic, friendly aesthetic with bold contrasting pastels: coral, lavender, sunny amber, and mint.",
    content: `Aesthetic: Playful Modern Pop & Vibrant.
- Palette:
  * Canvas / Background: "#fffdf5" (warm vanilla) or "#f3e8ff" (light lavender)
  * Primary Pop: "#ff5e7e" (coral pink) or "#ffaa00" (sunny amber)
  * Secondary Pop: "#38bdf8" (sky blue) or "#34d399" (fresh mint)
  * Text: "#1e1b4b" (deep indigo ink for sharp contrast)
- Typography:
  * Big punchy headings (42px–56px, bold)
- Layout Rules:
  * Decorative stars, circles, and colorful pill badges
  * Asymmetric, energetic positioning while keeping text centered and clear.`,
  },

  // ─── Component Blueprints ───────────────────────────────────────────────────
  {
    id: "blueprint-cta-section",
    title: "Call to Action (CTA) Button & Card Blueprint",
    category: "component_blueprint",
    keywords: ["cta", "button", "call to action", "banner", "card", "signup", "register", "subscribe"],
    summary: "Optimal structural layout for a high-converting CTA card with container, heading, value prop, and button.",
    content: `Component Blueprint: Call to Action (CTA) Card & Button.
- Structure & Dimensions:
  1. Card Background:
     - Shape: rectangle
     - Width: 500px–700px, Height: 240px–300px
     - Centered horizontally: left = (pageWidth - cardWidth) / 2
     - Fill: Contrast neutral (e.g. #f8fafc on light or #1e293b on dark)
  2. Headline:
     - Position: top = cardTop + 36px, left = cardLeft + 40px
     - Width = cardWidth - 80px, fontSize: 26px–32px, bold, textAlign: "center"
  3. Supporting Text / Subhead:
     - Position: top = headlineTop + 44px, left = cardLeft + 40px
     - Width = cardWidth - 80px, fontSize: 15px–16px, textAlign: "center", color: muted
  4. Action Button:
     - Shape: rectangle
     - Width: 180px–220px, Height: 48px–52px
     - Horizontally centered: left = cardLeft + (cardWidth - buttonWidth) / 2
     - Position: top = cardTop + cardHeight - 80px
     - Fill: Bold primary accent color (e.g. #2563eb, #ff007f, #d4af37)
  5. Button Text:
     - Centered inside button: top = buttonTop + 14px, left = buttonLeft
     - Width = buttonWidth, fontSize: 15px–16px, fontWeight: "bold", textAlign: "center", color: #ffffff`,
  },
  {
    id: "blueprint-badge-pill",
    title: "Category Badge & Tag Pill Blueprint",
    category: "component_blueprint",
    keywords: ["badge", "pill", "tag", "label", "chip", "category", "status", "promo"],
    summary: "Compact tag pill for announcements, categories, discounts, or feature highlights.",
    content: `Component Blueprint: Category / Status Badge Pill.
- Structure & Dimensions:
  1. Pill Background:
     - Shape: rectangle
     - Width: 100px–180px (approx text width + 32px padding), Height: 30px–36px
     - Fill: Soft pastel tint (e.g. #e0e7ff or #fef3c7) or solid dark
  2. Pill Label Text:
     - Position: top = pillTop + 7px, left = pillLeft
     - Width = pillWidth
     - fontSize: 12px–13px, fontWeight: "bold", textAlign: "center"
     - Color: Deep saturated contrast (e.g. #3730a3 or #92400e)
  3. Placement:
     - Typically positioned 16px–24px directly above the main heading.`,
  },
  {
    id: "blueprint-testimonial-quote",
    title: "Testimonial & Quote Box Blueprint",
    category: "component_blueprint",
    keywords: ["testimonial", "quote", "review", "customer", "feedback", "card", "author"],
    summary: "Elegant layout for customer quotes, testimonials, or social proof blocks.",
    content: `Component Blueprint: Testimonial & Quote Box.
- Structure & Dimensions:
  1. Container Card:
     - Width: 460px–600px, Height: 200px–240px
     - Fill: Subdued clean background (#f8fafc or #18181b)
  2. Accent Bar / Quotation Mark:
     - Vertical accent line on the left side: left = cardLeft + 24px, top = cardTop + 24px, width: 4px, height: cardHeight - 48px, color: accentColor
  3. Quote Body Text:
     - Position: left = cardLeft + 44px, top = cardTop + 28px
     - Width = cardWidth - 70px
     - fontSize: 16px–18px, fontStyle: "italic", line-height comfortable
  4. Author / Caption:
     - Position: left = cardLeft + 44px, top = quoteBottom + 16px
     - Width = cardWidth - 70px
     - fontSize: 13px–14px, fontWeight: "bold", color: muted`,
  },
  {
    id: "blueprint-divider-section",
    title: "Section Divider & Accent Line Blueprint",
    category: "component_blueprint",
    keywords: ["divider", "line", "separator", "rule", "border", "horizontal line"],
    summary: "Clean separation between page sections using proportional lines and balanced margins.",
    content: `Component Blueprint: Section Divider Line.
- Dimensions & Guidelines:
  1. Full-width Content Divider:
     - Type: add_line
     - Width: 60% to 80% of page width (e.g. 600px–1000px on 1920px canvas)
     - Height (thickness): 2px (subtle) to 4px (bold)
     - Color: Subtle muted gray (#e2e8f0 on light, #27272a on dark) or brand accent
     - Spacing: Keep 32px–48px vertical margin before and after the line.
  2. Short Accent Underline (under headings):
     - Width: 60px–120px, Height: 3px–5px
     - Position: Centered or aligned directly under the heading with 12px–16px gap
     - Color: Vibrant accent color matching the primary branding.`,
  },

  // ─── Layout & Accessibility Rules ──────────────────────────────────────────
  {
    id: "layout-visual-hierarchy",
    title: "Visual Hierarchy & 8px Spacing Grid",
    category: "layout_pattern",
    keywords: ["hierarchy", "spacing", "grid", "padding", "margin", "align", "scale"],
    summary: "Golden rules for element spacing, typography scales, and vertical rhythm.",
    content: `Layout Pattern: Visual Hierarchy & 8px Spacing Grid.
- 8px Spacing Rule: All paddings, margins, and gaps should be multiples of 8:
  * Tight gap (between heading and subhead): 8px–16px
  * Medium gap (between section title and body card): 24px–32px
  * Large gap (between distinct sections): 48px–64px
  * Canvas margins: Minimum 60px–80px from page edges.
- Typography Scale Ratios:
  * Hero / Main Heading: 44px–60px (bold)
  * Section Heading: 28px–36px (bold)
  * Subheading / Lead: 18px–22px (medium)
  * Body Text: 14px–16px (regular)
  * Small / Caption / Tag: 12px–13px (semibold)
- Alignment Rule: Never scatter items randomly. Align their left edges to a common X coordinate, or center them horizontally on the canvas width midpoint.`,
  },
];
