"""
FastAPI route handlers for Canva AI Design Agent.
"""
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Body
from app.models.chat import ChatRequest, ChatResponse, PlanRequest, ExecuteRequest, ExecuteResponse
from app.models.plan import Plan, PlanExecutionResult
from app.models.tool import ToolDefinition, MCPListToolsResponse
from app.agents.orchestrator import orchestrator
from app.tools.registry import registry
from app.mcp.server import handle_mcp_json_rpc
from app.models.design import DesignContext

router = APIRouter()


@router.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "canva-ai-design-agent",
        "version": "1.0.0"
    }


@router.post("/api/chat", response_model=ChatResponse, tags=["Agent"])
async def chat_endpoint(request: ChatRequest):
    """
    Unified end-to-end endpoint:
    Natural language request -> Planner Agent -> Plan Validation -> Execution Agent -> Tool Execution -> State Update.
    """
    try:
        response = await orchestrator.handle_chat_request(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent processing error: {str(e)}")


@router.post("/api/plan", response_model=Plan, tags=["Planner"])
async def plan_endpoint(request: PlanRequest):
    """
    Planner Agent endpoint:
    Analyzes intent and design context, returning a structured Plan without executing it.
    """
    try:
        plan = await orchestrator.handle_plan_only(
            message=request.message,
            design_context=request.design_context,
            conversation_id=request.conversation_id
        )
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Planner error: {str(e)}")


@router.post("/api/execute", response_model=ExecuteResponse, tags=["Executor"])
async def execute_endpoint(request: ExecuteRequest):
    """
    Execution Agent endpoint:
    Executes a validated Plan sequentially across registered Canva tools.
    """
    try:
        ctx = request.design_context or DesignContext()
        exec_result = await orchestrator.handle_execute_only(
            plan=request.plan,
            design_context=ctx,
            conversation_id=request.conversation_id
        )
        applied = [
            {"tool": r.tool_name, "parameters": r.input_parameters, "result": r.output_result}
            for r in exec_result.records if r.status == "completed"
        ]
        return ExecuteResponse(
            conversation_id=request.conversation_id,
            execution=exec_result,
            updated_design_context=ctx,
            applied_operations=applied
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution error: {str(e)}")


@router.get("/api/tools", response_model=List[ToolDefinition], tags=["Tools"])
async def list_tools_endpoint():
    """Retrieve all available registered Canva tools and their JSON schemas."""
    return registry.list_tools()


@router.post("/api/mcp", tags=["MCP"])
async def mcp_endpoint(payload: Dict[str, Any] = Body(...)):
    """
    MCP (Model Context Protocol) JSON-RPC 2.0 endpoint.
    Allows external agents or tools to list and invoke Canva design capabilities.
    """
    ctx = DesignContext()
    response = await handle_mcp_json_rpc(payload, ctx)
    return response
