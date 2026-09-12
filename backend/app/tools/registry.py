"""
Tool Registry with schema validation and strict allowlist enforcement.
"""
import logging
from typing import Dict, List, Optional, Any
from app.tools.base import BaseTool
from app.models.tool import ToolDefinition, ToolResult, ToolError
from app.models.design import DesignContext
from app.tools.canva_tools import (
    CreateTextTool,
    UpdateTextTool,
    StyleTextTool,
    AddShapeTool,
    AddImageTool,
    MoveElementTool,
    ResizeElementTool,
    DeleteElementTool,
    SetBackgroundTool,
    GetDesignContextTool,
    GetSelectedElementTool,
    BatchDesignOperationsTool,
)

logger = logging.getLogger("canva_agent.tools_registry")


class ToolRegistry:
    """Registry maintaining available and registered Canva design tools."""

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        tools: List[BaseTool] = [
            CreateTextTool(),
            UpdateTextTool(),
            StyleTextTool(),
            AddShapeTool(),
            AddImageTool(),
            MoveElementTool(),
            ResizeElementTool(),
            DeleteElementTool(),
            SetBackgroundTool(),
            GetDesignContextTool(),
            GetSelectedElementTool(),
        ]
        for tool in tools:
            self.register_tool(tool)

        # Register batch tool with registry reference
        batch_tool = BatchDesignOperationsTool(registry_ref=self)
        self.register_tool(batch_tool)

    def register_tool(self, tool: BaseTool) -> None:
        """Register a new tool instance."""
        self._tools[tool.name] = tool
        logger.debug(f"Registered tool: {tool.name}")

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get tool instance by name."""
        return self._tools.get(name)

    def has_tool(self, name: str) -> bool:
        """Check if tool is registered."""
        return name in self._tools

    def list_tools(self) -> List[ToolDefinition]:
        """Return list of all registered tool definitions."""
        return [tool.definition for tool in self._tools.values()]

    def get_tool_names(self) -> List[str]:
        """Return names of registered tools."""
        return list(self._tools.keys())

    def validate_tool_arguments(self, tool_name: str, arguments: Dict[str, Any]) -> Optional[str]:
        """Validate argument dictionary against tool schema required fields."""
        tool = self.get_tool(tool_name)
        if not tool:
            return f"Tool '{tool_name}' is not registered."

        required_props = tool.input_schema.required
        for req in required_props:
            if req not in arguments or arguments[req] is None:
                return f"Missing required parameter '{req}' for tool '{tool_name}'."
        return None

    async def execute_tool(
        self,
        name: str,
        arguments: Dict[str, Any],
        context: Optional[DesignContext] = None
    ) -> ToolResult:
        """Execute a registered tool safely with error trapping."""
        tool = self.get_tool(name)
        if not tool:
            return ToolResult(
                success=False,
                tool=name,
                error=ToolError(
                    code="UNSUPPORTED_OPERATION",
                    message=f"This operation '{name}' is not currently supported by the Canva API."
                )
            )

        # Validation
        val_error = self.validate_tool_arguments(name, arguments)
        if val_error:
            return ToolResult(
                success=False,
                tool=name,
                error=ToolError(
                    code="INVALID_ARGUMENTS",
                    message=val_error
                )
            )

        try:
            return await tool.execute(arguments, context)
        except Exception as e:
            logger.error(f"Execution failed for tool '{name}': {e}", exc_info=True)
            return ToolResult(
                success=False,
                tool=name,
                error=ToolError(
                    code="EXECUTION_ERROR",
                    message=f"Error executing tool '{name}': {str(e)}"
                )
            )


# Global tool registry instance
registry = ToolRegistry()
