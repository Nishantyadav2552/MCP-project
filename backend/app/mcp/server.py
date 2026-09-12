"""
MCP (Model Context Protocol) JSON-RPC Endpoint Server.
Exposes Canva tools over standard MCP JSON-RPC protocol.
"""
import logging
from typing import Dict, Any
from app.tools.registry import registry
from app.mcp.adapter import format_mcp_tool_list, format_mcp_tool_result
from app.models.design import DesignContext

logger = logging.getLogger("canva_agent.mcp_server")


async def handle_mcp_json_rpc(request: Dict[str, Any], context: DesignContext) -> Dict[str, Any]:
    """Process incoming MCP JSON-RPC 2.0 requests."""
    req_id = request.get("id")
    method = request.get("method")
    params = request.get("params", {})

    if method == "tools/list":
        tools = registry.list_tools()
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": format_mcp_tool_list(tools)
            }
        }

    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        if not tool_name:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32602, "message": "Missing 'name' parameter for tools/call."}
            }

        tool_result = await registry.execute_tool(tool_name, arguments, context)
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": format_mcp_tool_result(tool_result)
        }

    elif method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {"listChanged": False}
                },
                "serverInfo": {
                    "name": "canva-ai-design-agent-mcp",
                    "version": "1.0.0"
                }
            }
        }

    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {
                "code": -32601,
                "message": f"Method '{method}' not found."
            }
        }
