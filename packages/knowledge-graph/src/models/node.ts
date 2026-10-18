import {
  ElementType,
  ElementGeometry,
  TextFormatting,
  SemanticRole,
} from "@canva-cursor/shared";

export type ProvenanceSource = "canva_authoritative" | "inferred_model" | "user_specified";

export interface PropertyWithProvenance<T> {
  value: T;
  source: ProvenanceSource;
  confidence?: number; // 0.0 to 1.0 for inferred properties
}

export interface PageNode {
  id: string;
  designId: string;
  type: "absolute" | "flow" | "unsupported";
  dimensions: {
    width: number;
    height: number;
  };
  backgroundColor?: string;
  locked: boolean;
}

export interface ElementNode {
  id: string; // Stable handle ID
  pageId: string;
  designId: string;
  type: ElementType;
  zIndex: number;
  
  // Positional and visual geometry (Authoritative from Canva)
  geometry: PropertyWithProvenance<ElementGeometry>;
  
  // Locked status
  locked: PropertyWithProvenance<boolean>;

  // Text attributes (when applicable)
  text?: PropertyWithProvenance<string>;
  formatting?: PropertyWithProvenance<TextFormatting>;

  // Shapes / Rects
  fillColor?: PropertyWithProvenance<string>;
  strokeColor?: PropertyWithProvenance<string>;
  strokeWidth?: PropertyWithProvenance<number>;

  // Semantic role (Inferred by role classifier)
  semanticRole: PropertyWithProvenance<SemanticRole>;

  // Structural hierarchy
  parentGroupId?: string;
  childElementIds?: string[];

  // Version tracking
  version: string;
  updatedAt: number;
}
