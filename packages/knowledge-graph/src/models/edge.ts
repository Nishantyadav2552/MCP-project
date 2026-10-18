export type RelationshipType =
  | "CONTAINS"
  | "ALIGNED_WITH"
  | "NEAR"
  | "OVERLAPS"
  | "ABOVE"
  | "BELOW"
  | "SAME_STYLE_AS"
  | "SEMANTICALLY_RELATED_TO";

export type EdgeProvenance = "grounded_geometry" | "grounded_hierarchy" | "inferred_semantics";

export interface AlignmentMetadata {
  axis: "left" | "right" | "top" | "bottom" | "center_x" | "center_y";
  delta: number; // Difference in pixels (<= tolerance)
}

export interface ProximityMetadata {
  distance: number; // Euclidean distance between bounding boxes in pixels
}

export interface OverlapMetadata {
  intersectionArea: number;
  intersectionBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface StyleMatchMetadata {
  matchedAttributes: Array<"color" | "fontSize" | "fontFamily" | "fontWeight" | "textAlign" | "fillColor">;
}

export interface RelationshipEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  provenance: EdgeProvenance;
  metadata?: AlignmentMetadata | ProximityMetadata | OverlapMetadata | StyleMatchMetadata | Record<string, unknown>;
}
