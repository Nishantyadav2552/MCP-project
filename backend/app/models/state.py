"""
Conversation and Design State models.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.design import DesignContext
from app.models.plan import Plan, PlanExecutionResult


class ConversationTurn(BaseModel):
    user_message: str
    assistant_response: str
    plan: Optional[Plan] = None
    execution: Optional[PlanExecutionResult] = None
    applied_tools: List[str] = Field(default_factory=list)


class ConversationSession(BaseModel):
    conversation_id: str
    turns: List[ConversationTurn] = Field(default_factory=list)
    current_design_context: DesignContext = Field(default_factory=DesignContext)
    element_id_map: Dict[str, str] = Field(
        default_factory=dict,
        description="Maps human-readable labels like 'heading', 'cta_button' to actual element IDs"
    )
    last_plan: Optional[Plan] = None
    created_at: float = 0.0
    updated_at: float = 0.0
