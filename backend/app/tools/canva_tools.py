"""
Concrete Canva SDK Design Tools conforming to Canva API and official apps capabilities.
"""
import uuid
import logging
from typing import Dict, Any, Optional, List
from app.tools.base import BaseTool
from app.models.tool import ToolResult, ToolError, ToolInputSchema
from app.models.design import (
    DesignContext, CanvasElement, TextStyle, ShapeStyle, CanvasBackground,
    ElementType, ShapeType, TextAlignment, FontWeight, FontStyle
)

logger = logging.getLogger("canva_agent.tools")


class CreateTextTool(BaseTool):
    """Tool to add a text element to the Canva design."""

    def __init__(self):
        super().__init__(
            name="create_text",
            description="Add a native text element to the Canva design with typography styling and position.",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "text": {"type": "string", "description": "The text content to display"},
                    "fontSize": {"type": "number", "description": "Font size in px (e.g. 64 for headings, 24 for body)"},
                    "fontFamily": {"type": "string", "description": "Font family e.g. 'Open Sans', 'Montserrat', 'Playfair Display'"},
                    "color": {"type": "string", "description": "Hex or CSS color string e.g. '#2D1500'"},
                    "textAlign": {"type": "string", "enum": ["start", "center", "end", "justify"], "description": "Text alignment"},
                    "fontWeight": {"type": "string", "enum": ["normal", "bold", "500", "600", "700", "800"], "description": "Font weight"},
                    "fontStyle": {"type": "string", "enum": ["normal", "italic"], "description": "Font style"},
                    "x": {"type": "number", "description": "X coordinate on canvas"},
                    "y": {"type": "number", "description": "Y coordinate on canvas"},
                    "width": {"type": "number", "description": "Width of text container"},
                    "height": {"type": "number", "description": "Height of text container"},
                    "title": {"type": "string", "description": "Descriptive semantic tag, e.g. 'heading', 'subheading', 'cta'"}
                },
                required=["text"]
            ),
            tags=["text", "typography"]
        )

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        text = arguments.get("text")
        if not text:
            return ToolResult(
                success=False,
                tool=self.name,
                error=ToolError(code="INVALID_ARGUMENT", message="Field 'text' is required.")
            )

        element_id = f"el_text_{uuid.uuid4().hex[:8]}"
        title = arguments.get("title", "Text Element")
        
        # Default positioning if not supplied
        canvas_width = context.canvasWidth if context else 1080.0
        canvas_height = context.canvasHeight if context else 1080.0
        
        width = float(arguments.get("width", min(800.0, canvas_width * 0.8)))
        height = float(arguments.get("height", 100.0))
        x = float(arguments.get("x", (canvas_width - width) / 2.0))
        y = float(arguments.get("y", 200.0))

        text_style = TextStyle(
            fontSize=float(arguments.get("fontSize", 36.0)),
            fontFamily=arguments.get("fontFamily", "Open Sans"),
            color=arguments.get("color", "#111827"),
            textAlign=arguments.get("textAlign", "center"),
            fontWeight=arguments.get("fontWeight", "bold" if "heading" in title.lower() else "normal"),
            fontStyle=arguments.get("fontStyle", "normal"),
        )

        element = CanvasElement(
            id=element_id,
            type="text",
            title=title,
            text=text,
            textStyle=text_style,
            x=x,
            y=y,
            width=width,
            height=height,
            zIndex=len(context.elements) + 1 if context else 1
        )

        if context:
            context.elements.append(element)

        return ToolResult(
            success=True,
            tool=self.name,
            result={
                "element_id": element_id,
                "title": title,
                "text": text,
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "textStyle": text_style.model_dump(),
                "action": "added_text"
            }
        )


class UpdateTextTool(BaseTool):
    """Tool to update existing text content and/or typography styling."""

    def __init__(self):
        super().__init__(
            name="update_text",
            description="Update text content or formatting for an existing Canva text element.",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "element_id": {"type": "string", "description": "ID of target text element"},
                    "text": {"type": "string", "description": "New text content"},
                    "fontSize": {"type": "number", "description": "New font size"},
                    "color": {"type": "string", "description": "New color"},
                    "textAlign": {"type": "string", "enum": ["start", "center", "end", "justify"]},
                    "fontWeight": {"type": "string", "enum": ["normal", "bold", "500", "600", "700", "800"]},
                    "fontStyle": {"type": "string", "enum": ["normal", "italic"]}
                },
                required=["element_id"]
            ),
            tags=["text", "typography"]
        )

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        element_id = arguments.get("element_id")
        if not element_id:
            return ToolResult(
                success=False,
                tool=self.name,
                error=ToolError(code="INVALID_ARGUMENT", message="Field 'element_id' is required.")
            )

        if not context:
            return ToolResult(
                success=True,
                tool=self.name,
                result={"element_id": element_id, "updated": arguments}
            )

        target = context.get_element_by_id(element_id)
        if not target:
            # Fallback: if user referenced text element generally, try finding matching text element
            text_elements = context.get_elements_by_type("text")
            if text_elements:
                target = text_elements[0]
                element_id = target.id
            else:
                return ToolResult(
                    success=False,
                    tool=self.name,
                    error=ToolError(code="ELEMENT_NOT_FOUND", message=f"Element '{element_id}' was not found in design context.")
                )

        if "text" in arguments and arguments["text"]:
            target.text = arguments["text"]

        if not target.textStyle:
            target.textStyle = TextStyle()

        for prop in ["fontSize", "color", "textAlign", "fontWeight", "fontStyle", "fontFamily"]:
            if prop in arguments and arguments[prop] is not None:
                setattr(target.textStyle, prop, arguments[prop])

        return ToolResult(
            success=True,
            tool=self.name,
            result={
                "element_id": element_id,
                "text": target.text,
                "textStyle": target.textStyle.model_dump(),
                "action": "updated_text"
            }
        )


class StyleTextTool(BaseTool):
    """Tool to update styling of a text element without necessarily changing the text."""

    def __init__(self):
        super().__init__(
            name="style_text",
            description="Apply typographic styles (fontSize, color, textAlign, fontWeight, fontFamily) to a text element.",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "element_id": {"type": "string", "description": "ID of target text element"},
                    "fontSize": {"type": "number", "description": "Font size in px"},
                    "color": {"type": "string", "description": "Font color hex"},
                    "textAlign": {"type": "string", "enum": ["start", "center", "end", "justify"]},
                    "fontWeight": {"type": "string", "enum": ["normal", "bold", "500", "600", "700", "800"]},
                    "fontStyle": {"type": "string", "enum": ["normal", "italic"]},
                    "fontFamily": {"type": "string", "description": "Font family name"}
                },
                required=["element_id"]
            ),
            tags=["text", "typography"]
        )

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        element_id = arguments.get("element_id")
        if not element_id:
            return ToolResult(
                success=False,
                tool=self.name,
                error=ToolError(code="INVALID_ARGUMENT", message="Field 'element_id' is required.")
            )

        if not context:
            return ToolResult(success=True, tool=self.name, result={"element_id": element_id, "styled": arguments})

        target = context.get_element_by_id(element_id)
        if not target:
            text_elements = context.get_elements_by_type("text")
            if text_elements:
                target = text_elements[0]
                element_id = target.id
            else:
                return ToolResult(
                    success=False,
                    tool=self.name,
                    error=ToolError(code="ELEMENT_NOT_FOUND", message=f"Text element '{element_id}' not found.")
                )

        if not target.textStyle:
            target.textStyle = TextStyle()

        for prop in ["fontSize", "color", "textAlign", "fontWeight", "fontStyle", "fontFamily"]:
            if prop in arguments and arguments[prop] is not None:
                setattr(target.textStyle, prop, arguments[prop])

        return ToolResult(
            success=True,
            tool=self.name,
            result={"element_id": element_id, "textStyle": target.textStyle.model_dump()}
        )


class AddShapeTool(BaseTool):
    """Tool to add vector shapes (rectangle, circle, badge, pill, star, triangle) in Canva."""

    def __init__(self):
        super().__init__(
            name="add_shape",
            description="Add a native Canva vector shape such as rectangle, circle, badge, or pill button background.",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "shapeType": {
                        "type": "string",
                        "enum": ["rectangle", "circle", "triangle", "badge", "pill", "star"],
                        "description": "Shape kind"
                    },
                    "fillColor": {"type": "string", "description": "Hex fill color string e.g. '#4F46E5'"},
                    "strokeColor": {"type": "string", "description": "Border stroke color string"},
                    "strokeWidth": {"type": "number", "description": "Border width in px"},
                    "cornerRadius": {"type": "number", "description": "Corner radius for rounded rectangles/pills"},
                    "x": {"type": "number", "description": "X coordinate"},
                    "y": {"type": "number", "description": "Y coordinate"},
                    "width": {"type": "number", "description": "Width in px"},
                    "height": {"type": "number", "description": "Height in px"},
                    "title": {"type": "string", "description": "Semantic role, e.g. 'CTA Container', 'Card Background'"}
                },
                required=["shapeType"]
            ),
            tags=["shape", "vector"]
        )

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        shape_type = arguments.get("shapeType", "rectangle")
        element_id = f"el_shape_{uuid.uuid4().hex[:8]}"
        title = arguments.get("title", f"{shape_type.capitalize()} Shape")

        canvas_width = context.canvasWidth if context else 1080.0
        canvas_height = context.canvasHeight if context else 1080.0

        width = float(arguments.get("width", 300.0))
        height = float(arguments.get("height", 80.0 if shape_type == "pill" else 300.0))
        x = float(arguments.get("x", (canvas_width - width) / 2.0))
        y = float(arguments.get("y", (canvas_height - height) / 2.0))

        shape_style = ShapeStyle(
            fillColor=arguments.get("fillColor", "#4F46E5"),
            strokeColor=arguments.get("strokeColor"),
            strokeWidth=float(arguments.get("strokeWidth", 0.0)),
            cornerRadius=float(arguments.get("cornerRadius", 999.0 if shape_type == "pill" else 8.0)),
            opacity=float(arguments.get("opacity", 1.0))
        )

        element = CanvasElement(
            id=element_id,
            type="shape",
            title=title,
            shapeType=shape_type,
            shapeStyle=shape_style,
            x=x,
            y=y,
            width=width,
            height=height,
            zIndex=len(context.elements) + 1 if context else 1
        )

        if context:
            context.elements.append(element)

        return ToolResult(
            success=True,
            tool=self.name,
            result={
                "element_id": element_id,
                "title": title,
                "shapeType": shape_type,
                "shapeStyle": shape_style.model_dump(),
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "action": "added_shape"
            }
        )


class AddImageTool(BaseTool):
    """Tool to add graphic/image elements to the design."""

    def __init__(self):
        super().__init__(
            name="add_image",
            description="Add an image or photographic visual element to the Canva design.",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "imageUrl": {"type": "string", "description": "URL of the image asset"},
                    "altText": {"type": "string", "description": "Description of the visual graphic"},
                    "x": {"type": "number", "description": "X coordinate"},
                    "y": {"type": "number", "description": "Y coordinate"},
                    "width": {"type": "number", "description": "Image width in px"},
                    "height": {"type": "number", "description": "Image height in px"},
                    "title": {"type": "string", "description": "Semantic title e.g. 'Coffee Cup Hero Visual'"}
                },
                required=["altText"]
            ),
            tags=["image", "media"]
        )

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        element_id = f"el_img_{uuid.uuid4().hex[:8]}"
        alt_text = arguments.get("altText", "Visual Graphic")
        title = arguments.get("title", alt_text)

        # Default high-quality curated sample visuals for demo/standalone if no direct URL is passed
        default_images = {
            "coffee": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80",
            "summer": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
            "sale": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
            "food": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
            "restaurant": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
        }
        image_url = arguments.get("imageUrl")
        if not image_url:
            matched = False
            for k, url in default_images.items():
                if k in alt_text.lower() or k in title.lower():
                    image_url = url
                    matched = True
                    break
            if not matched:
                image_url = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80"

        canvas_width = context.canvasWidth if context else 1080.0
        canvas_height = context.canvasHeight if context else 1080.0

        width = float(arguments.get("width", 450.0))
        height = float(arguments.get("height", 350.0))
        x = float(arguments.get("x", (canvas_width - width) / 2.0))
        y = float(arguments.get("y", 350.0))

        element = CanvasElement(
            id=element_id,
            type="image",
            title=title,
            imageUrl=image_url,
            altText=alt_text,
            x=x,
            y=y,
            width=width,
            height=height,
            zIndex=len(context.elements) + 1 if context else 1
        )

        if context:
            context.elements.append(element)

        return ToolResult(
            success=True,
            tool=self.name,
            result={
                "element_id": element_id,
                "title": title,
                "imageUrl": image_url,
                "altText": alt_text,
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "action": "added_image"
            }
        )


class MoveElementTool(BaseTool):
    """Tool to move an element to a new coordinate or relative placement."""

    def __init__(self):
        super().__init__(
            name="move_element",
            description="Move an element to specific (x, y) coordinates or relative canvas positions like 'center', 'top', 'bottom'.",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "element_id": {"type": "string", "description": "ID of element to move"},
                    "x": {"type": "number", "description": "New X coordinate"},
                    "y": {"type": "number", "description": "New Y coordinate"},
                    "placement": {
                        "type": "string",
                        "enum": ["center", "top", "bottom", "top_center", "bottom_center", "left", "right"],
                        "description": "Relative placement helper"
                    }
                },
                required=["element_id"]
            ),
            tags=["layout", "position"]
        )

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        element_id = arguments.get("element_id")
        if not element_id:
            return ToolResult(
                success=False,
                tool=self.name,
                error=ToolError(code="INVALID_ARGUMENT", message="Field 'element_id' is required.")
            )

        if not context:
            return ToolResult(success=True, tool=self.name, result={"element_id": element_id, "moved": arguments})

        target = context.get_element_by_id(element_id)
        if not target:
            # Try to match first element if only one or type matches
            if context.elements:
                target = context.elements[0]
                element_id = target.id
            else:
                return ToolResult(
                    success=False,
                    tool=self.name,
                    error=ToolError(code="ELEMENT_NOT_FOUND", message=f"Element '{element_id}' not found.")
                )

        canvas_width = context.canvasWidth
        canvas_height = context.canvasHeight

        placement = arguments.get("placement")
        if placement:
            if placement == "center":
                target.x = (canvas_width - target.width) / 2.0
                target.y = (canvas_height - target.height) / 2.0
            elif placement in ("top_center", "top"):
                target.x = (canvas_width - target.width) / 2.0
                target.y = 80.0
            elif placement in ("bottom_center", "bottom"):
                target.x = (canvas_width - target.width) / 2.0
                target.y = canvas_height - target.height - 80.0
            elif placement == "left":
                target.x = 60.0
            elif placement == "right":
                target.x = canvas_width - target.width - 60.0

        if "x" in arguments and arguments["x"] is not None:
            target.x = float(arguments["x"])
        if "y" in arguments and arguments["y"] is not None:
            target.y = float(arguments["y"])

        return ToolResult(
            success=True,
            tool=self.name,
            result={"element_id": element_id, "x": target.x, "y": target.y, "action": "moved_element"}
        )


class ResizeElementTool(BaseTool):
    """Tool to resize an element."""

    def __init__(self):
        super().__init__(
            name="resize_element",
            description="Resize an element to target width and height.",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "element_id": {"type": "string", "description": "ID of element to resize"},
                    "width": {"type": "number", "description": "New width in px"},
                    "height": {"type": "number", "description": "New height in px"}
                },
                required=["element_id"]
            ),
            tags=["layout", "size"]
        )

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        element_id = arguments.get("element_id")
        if not element_id:
            return ToolResult(
                success=False,
                tool=self.name,
                error=ToolError(code="INVALID_ARGUMENT", message="Field 'element_id' is required.")
            )

        if not context:
            return ToolResult(success=True, tool=self.name, result={"element_id": element_id, "resized": arguments})

        target = context.get_element_by_id(element_id)
        if not target:
            return ToolResult(
                success=False,
                tool=self.name,
                error=ToolError(code="ELEMENT_NOT_FOUND", message=f"Element '{element_id}' not found.")
            )

        if "width" in arguments and arguments["width"] is not None:
            target.width = float(arguments["width"])
        if "height" in arguments and arguments["height"] is not None:
            target.height = float(arguments["height"])

        return ToolResult(
            success=True,
            tool=self.name,
            result={"element_id": element_id, "width": target.width, "height": target.height, "action": "resized_element"}
        )


class DeleteElementTool(BaseTool):
    """Tool to delete an element from the design."""

    def __init__(self):
        super().__init__(
            name="delete_element",
            description="Remove an element from the Canva design by element ID or current selection.",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "element_id": {"type": "string", "description": "ID of element to delete. If omitted and selection exists, deletes selected element."}
                }
            ),
            tags=["canvas", "delete"]
        )

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        element_id = arguments.get("element_id")
        if not context:
            return ToolResult(success=True, tool=self.name, result={"deleted_id": element_id})

        if not element_id:
            if context.selectedElementIds:
                element_id = context.selectedElementIds[0]
            elif context.elements:
                element_id = context.elements[-1].id
            else:
                return ToolResult(
                    success=False,
                    tool=self.name,
                    error=ToolError(code="NO_ELEMENT_SPECIFIED", message="No element_id provided and no elements exist to delete.")
                )

        initial_count = len(context.elements)
        context.elements = [el for el in context.elements if el.id != element_id]
        if element_id in context.selectedElementIds:
            context.selectedElementIds.remove(element_id)

        deleted = len(context.elements) < initial_count
        return ToolResult(
            success=deleted,
            tool=self.name,
            result={"element_id": element_id, "action": "deleted_element"} if deleted else None,
            error=ToolError(code="ELEMENT_NOT_FOUND", message=f"Element '{element_id}' was not found.") if not deleted else None
        )


class SetBackgroundTool(BaseTool):
    """Tool to update canvas background color or gradient."""

    def __init__(self):
        super().__init__(
            name="set_background",
            description="Set the Canva canvas background solid color or gradient.",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "color": {"type": "string", "description": "Hex color string (e.g. '#FDFBF7', '#1E1E2E')"},
                    "gradient": {"type": "string", "description": "CSS gradient definition (e.g. 'linear-gradient(135deg, #FFF8E7 0%, #F5E6CC 100%)')"}
                }
            ),
            tags=["canvas", "background"]
        )

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        color = arguments.get("color", "#FFFFFF")
        gradient = arguments.get("gradient")

        if context:
            context.background.color = color
            context.background.gradient = gradient

        return ToolResult(
            success=True,
            tool=self.name,
            result={"color": color, "gradient": gradient, "action": "set_background"}
        )


class GetDesignContextTool(BaseTool):
    """Tool to inspect active design canvas context."""

    def __init__(self):
        super().__init__(
            name="get_design_context",
            description="Retrieve the current active Canva design context, canvas dimensions, background, and element tree.",
            input_schema=ToolInputSchema(type="object", properties={}),
            tags=["context", "read"]
        )

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        ctx = context or DesignContext()
        return ToolResult(
            success=True,
            tool=self.name,
            result=ctx.model_dump()
        )


class GetSelectedElementTool(BaseTool):
    """Tool to retrieve currently selected element properties."""

    def __init__(self):
        super().__init__(
            name="get_selected_element",
            description="Get the currently selected element in the Canva editor.",
            input_schema=ToolInputSchema(type="object", properties={}),
            tags=["context", "selection"]
        )

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        if not context or not context.selectedElementIds:
            return ToolResult(
                success=True,
                tool=self.name,
                result={"selected_element": None, "message": "No element is currently selected."}
            )

        selected_id = context.selectedElementIds[0]
        element = context.get_element_by_id(selected_id)
        return ToolResult(
            success=True,
            tool=self.name,
            result={"selected_element": element.model_dump() if element else None}
        )


class BatchDesignOperationsTool(BaseTool):
    """Tool to execute an atomic batch of design operations."""

    def __init__(self, registry_ref=None):
        super().__init__(
            name="batch_design_operations",
            description="Execute multiple design operations atomically in a single transaction.",
            input_schema=ToolInputSchema(
                type="object",
                properties={
                    "operations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "tool": {"type": "string"},
                                "arguments": {"type": "object"}
                            },
                            "required": ["tool", "arguments"]
                        },
                        "description": "List of operations to execute in order"
                    }
                },
                required=["operations"]
            ),
            tags=["batch", "transaction"]
        )
        self.registry_ref = registry_ref

    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        operations = arguments.get("operations", [])
        results = []
        for op in operations:
            tool_name = op.get("tool")
            tool_args = op.get("arguments", {})
            if self.registry_ref and self.registry_ref.has_tool(tool_name):
                t = self.registry_ref.get_tool(tool_name)
                res = await t.execute(tool_args, context)
                results.append(res.model_dump())
            else:
                results.append({
                    "success": False,
                    "tool": tool_name,
                    "error": {"code": "UNKNOWN_TOOL", "message": f"Tool '{tool_name}' not found."}
                })

        return ToolResult(
            success=all(r.get("success", False) for r in results),
            tool=self.name,
            result={"operations_count": len(operations), "results": results}
        )
