"""
Chat and API Request / Response schemas.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.plan import Plan, PlanExecutionResult
from app.models.design import DesignContext, CanvasElement


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user', 'assistant', 'system'")
    content: str = Field(..., description="Message text content")
    plan: Optional[Plan] = Field(default=None, description="Structured plan if generated")
    execution: Optional[PlanExecutionResult] = Field(default=None, description="Execution outcome if run")
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., description="User natural-language instruction")
    conversation_id: Optional[str] = Field(default=None, description="Conversation session ID")
    design_context: Optional[DesignContext] = Field(default=None, description="Current Canva canvas design context")
    auto_execute: bool = Field(default=True, description="Whether to immediately execute generated plan")


class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    plan: Optional[Plan] = None
    execution: Optional[PlanExecutionResult] = None
    updated_design_context: Optional[DesignContext] = None
    applied_operations: Optional[List[Dict[str, Any]]] = None


class PlanRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    design_context: Optional[DesignContext] = None


class ExecuteRequest(BaseModel):
    conversation_id: str
    plan: Plan
    design_context: Optional[DesignContext] = None


class ExecuteResponse(BaseModel):
    conversation_id: str
    execution: PlanExecutionResult
    updated_design_context: Optional[DesignContext] = None
    applied_operations: List[Dict[str, Any]] = Field(default_factory=list)
