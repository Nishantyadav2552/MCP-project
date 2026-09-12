"""
Base Tool class and interfaces for Canva design tools.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from app.models.tool import ToolDefinition, ToolResult, ToolError, ToolInputSchema
from app.models.design import DesignContext


class BaseTool(ABC):
    """Abstract base class for all Canva agent tools."""

    def __init__(self, name: str, description: str, input_schema: ToolInputSchema, tags: Optional[list] = None):
        self.name = name
        self.description = description
        self.input_schema = input_schema
        self.tags = tags or []

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            input_schema=self.input_schema,
            tags=self.tags
        )

    @abstractmethod
    async def execute(self, arguments: Dict[str, Any], context: Optional[DesignContext] = None) -> ToolResult:
        """Execute the tool operation against the design context and return structured ToolResult."""
        pass
