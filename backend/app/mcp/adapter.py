"""
MCP (Model Context Protocol) Adapter.
Converts internal tool definitions and calls to/from standard MCP JSON-RPC format.
"""
from typing import Dict, Any, List
from app.models.tool import ToolDefinition, ToolResult


def format_mcp_tool_list(tools: List[ToolDefinition]) -> List[Dict[str, Any]]:
    """Convert ToolDefinitions into MCP-compliant tools list format."""
    mcp_tools = []
    for t in tools:
        mcp_tools.append({
            "name": t.name,
            "description": t.description,
            "inputSchema": {
                "type": t.input_schema.type,
                "properties": t.input_schema.properties,
                "required": t.input_schema.required
            }
        })
    return mcp_tools


def format_mcp_tool_result(result: ToolResult) -> Dict[str, Any]:
    """Convert ToolResult into MCP-compliant call result structure."""
    if result.success:
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"Successfully executed tool '{result.tool}'."
                }
            ],
            "structuredContent": result.result,
            "isError": False
        }
    else:
        err = result.error
        msg = err.message if err else "Unknown error"
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"Tool '{result.tool}' failed: {msg}"
                }
            ],
            "error": {
                "code": err.code if err else "UNKNOWN",
                "message": msg
            },
            "isError": True
        }
