"""
Unit tests for Canva Tool Registry and concrete tools.
"""
import pytest
from app.tools.registry import registry
from app.models.design import DesignContext, CanvasElement, TextStyle


@pytest.mark.asyncio
async def test_tool_registry_lists_all_tools():
    tools = registry.list_tools()
    assert len(tools) >= 10
    names = [t.name for t in tools]
    assert "create_text" in names
    assert "add_shape" in names
    assert "add_image" in names
    assert "move_element" in names
    assert "delete_element" in names
    assert "set_background" in names


@pytest.mark.asyncio
async def test_create_text_tool_execution():
    context = DesignContext(canvasWidth=1080, canvasHeight=1080)
    result = await registry.execute_tool(
        "create_text",
        {
            "text": "Special Offer",
            "fontSize": 44,
            "color": "#FF5722",
            "textAlign": "center"
        },
        context
    )

    assert result.success is True
    assert result.result["text"] == "Special Offer"
    assert len(context.elements) == 1
    assert context.elements[0].textStyle.fontSize == 44


@pytest.mark.asyncio
async def test_add_shape_tool_execution():
    context = DesignContext()
    result = await registry.execute_tool(
        "add_shape",
        {
            "shapeType": "pill",
            "fillColor": "#4F46E5",
            "width": 200,
            "height": 60
        },
        context
    )

    assert result.success is True
    assert result.result["shapeType"] == "pill"
    assert len(context.elements) == 1
    assert context.elements[0].shapeStyle.cornerRadius == 999.0


@pytest.mark.asyncio
async def test_unsupported_tool_rejection():
    context = DesignContext()
    result = await registry.execute_tool(
        "invented_fake_tool",
        {"arg": "test"},
        context
    )

    assert result.success is False
    assert result.error.code == "UNSUPPORTED_OPERATION"
    assert "not currently supported" in result.error.message
