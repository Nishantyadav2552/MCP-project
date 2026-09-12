"""
Standardized tool definition and execution response models (MCP-compatible).
"""
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class ToolParameterProperty(BaseModel):
    type: str
    description: Optional[str] = None
    enum: Optional[List[str]] = None
    default: Optional[Any] = None


class ToolInputSchema(BaseModel):
    type: str = "object"
    properties: Dict[str, Any] = Field(default_factory=dict)
    required: List[str] = Field(default_factory=list)


class ToolDefinition(BaseModel):
    name: str = Field(..., description="Unique tool identifier")
    description: str = Field(..., description="Clear explanation of what the tool accomplishes in Canva")
    input_schema: ToolInputSchema = Field(..., description="JSON Schema definition of accepted arguments")
    tags: List[str] = Field(default_factory=list, description="Categorization tags, e.g. ['typography', 'canvas']")


class ToolError(BaseModel):
    code: str = Field(..., description="Error code e.g. INVALID_ARGUMENT, ELEMENT_NOT_FOUND, SDK_ERROR")
    message: str = Field(..., description="Detailed error description")
    details: Optional[Dict[str, Any]] = None


class ToolResult(BaseModel):
    success: bool
    tool: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[ToolError] = None


# MCP Protocol Request/Response models
class MCPToolCallRequest(BaseModel):
    name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


class MCPListToolsResponse(BaseModel):
    tools: List[ToolDefinition]
