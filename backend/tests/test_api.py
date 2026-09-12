"""
Integration tests for FastAPI endpoints.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_check_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "canva-ai-design-agent"


@pytest.mark.asyncio
async def test_tools_list_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/tools")
        assert response.status_code == 200
        tools = response.json()
        assert isinstance(tools, list)
        assert len(tools) >= 10
        tool_names = [t["name"] for t in tools]
        assert "create_text" in tool_names
        assert "set_background" in tool_names


@pytest.mark.asyncio
async def test_chat_endpoint_e2e():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/chat",
            json={
                "message": "Create an Instagram post for a coffee shop with heading 'Fresh Coffee Every Morning'",
                "conversation_id": "test_conv_1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
        assert "plan" in data
        assert data["plan"]["goal"] != ""
        assert len(data["plan"]["tasks"]) > 0
        assert data["execution"]["success"] is True
        assert len(data["updated_design_context"]["elements"]) > 0


@pytest.mark.asyncio
async def test_mcp_json_rpc_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. MCP tools/list
        response = await client.post(
            "/api/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/list",
                "params": {}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert "tools" in data["result"]
        assert len(data["result"]["tools"]) >= 10

        # 2. MCP tools/call
        response_call = await client.post(
            "/api/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "create_text",
                    "arguments": {"text": "MCP Generated Header", "fontSize": 48}
                }
            }
        )
        assert response_call.status_code == 200
        call_data = response_call.json()
        assert call_data["result"]["isError"] is False
        assert call_data["result"]["structuredContent"]["text"] == "MCP Generated Header"
