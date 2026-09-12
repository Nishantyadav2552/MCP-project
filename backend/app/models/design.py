"""
Design and Canvas models representing Canva SDK elements, layout, and styling.
"""
from typing import Optional, List, Dict, Any, Union, Literal
from pydantic import BaseModel, Field


ElementType = Literal["text", "shape", "image", "line", "table"]
ShapeType = Literal["rectangle", "circle", "triangle", "badge", "pill", "star"]
TextAlignment = Literal["start", "center", "end", "justify"]
FontWeight = Literal["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]
FontStyle = Literal["normal", "italic"]


class Position(BaseModel):
    x: float = Field(default=0.0, description="X coordinate in pixels or percentage")
    y: float = Field(default=0.0, description="Y coordinate in pixels or percentage")


class Dimensions(BaseModel):
    width: float = Field(default=100.0, description="Width in pixels")
    height: float = Field(default=100.0, description="Height in pixels")


class TextStyle(BaseModel):
    fontSize: Optional[float] = Field(default=24.0, description="Font size in points/px")
    fontFamily: Optional[str] = Field(default="Open Sans", description="Font family name")
    fontWeight: Optional[FontWeight] = Field(default="normal", description="Font weight")
    fontStyle: Optional[FontStyle] = Field(default="normal", description="Font style (italic/normal)")
    textAlign: Optional[TextAlignment] = Field(default="center", description="Text alignment")
    color: Optional[str] = Field(default="#111827", description="Hex or rgba color string")
    letterSpacing: Optional[float] = Field(default=0.0, description="Letter spacing")
    lineHeight: Optional[float] = Field(default=1.2, description="Line height multiplier")


class ShapeStyle(BaseModel):
    fillColor: Optional[str] = Field(default="#4F46E5", description="Fill color hex/rgba")
    strokeColor: Optional[str] = Field(default=None, description="Border/stroke color")
    strokeWidth: Optional[float] = Field(default=0.0, description="Border width")
    cornerRadius: Optional[float] = Field(default=0.0, description="Corner radius for rectangles")
    opacity: Optional[float] = Field(default=1.0, description="Opacity from 0 to 1")


class CanvasElement(BaseModel):
    id: str = Field(..., description="Unique element identifier")
    type: ElementType = Field(..., description="Element type (text, shape, image, etc.)")
    title: Optional[str] = Field(default="", description="Human-readable label/role (e.g. 'Main Heading', 'CTA Button')")
    x: float = Field(default=0.0, description="X coordinate on canvas (0 to canvas width)")
    y: float = Field(default=0.0, description="Y coordinate on canvas (0 to canvas height)")
    width: float = Field(default=200.0, description="Element width")
    height: float = Field(default=100.0, description="Element height")
    rotation: Optional[float] = Field(default=0.0, description="Rotation angle in degrees")
    zIndex: Optional[int] = Field(default=1, description="Layer stacking index")
    
    # Specific payload fields
    text: Optional[str] = Field(default=None, description="Text content if type is text")
    textStyle: Optional[TextStyle] = Field(default=None, description="Typographic styling")
    shapeType: Optional[ShapeType] = Field(default=None, description="Shape kind if type is shape")
    shapeStyle: Optional[ShapeStyle] = Field(default=None, description="Shape vector styling")
    imageUrl: Optional[str] = Field(default=None, description="Image source URL or asset token")
    altText: Optional[str] = Field(default=None, description="Alt text description for images")


class CanvasBackground(BaseModel):
    color: Optional[str] = Field(default="#FFFFFF", description="Background solid color")
    gradient: Optional[str] = Field(default=None, description="CSS gradient string if gradient")
    imageUrl: Optional[str] = Field(default=None, description="Background image URL if any")


class DesignContext(BaseModel):
    canvasWidth: float = Field(default=1080.0, description="Width of the Canva design canvas")
    canvasHeight: float = Field(default=1080.0, description="Height of the Canva design canvas")
    unit: str = Field(default="px", description="Canvas measurement unit")
    designType: Optional[str] = Field(default="Instagram Post", description="Design template type")
    background: CanvasBackground = Field(default_factory=CanvasBackground)
    elements: List[CanvasElement] = Field(default_factory=list, description="All elements currently on canvas")
    selectedElementIds: List[str] = Field(default_factory=list, description="Currently selected element IDs")
    
    def get_element_by_id(self, element_id: str) -> Optional[CanvasElement]:
        for el in self.elements:
            if el.id == element_id:
                return el
        return None

    def get_elements_by_type(self, element_type: ElementType) -> List[CanvasElement]:
        return [el for el in self.elements if el.type == element_type]
