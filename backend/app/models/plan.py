"""
Strongly-typed schemas for Planner Agent plans, tasks, actions, and execution statuses.
"""
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


# Allowed actions strictly matching supported Canva tools
AllowedAction = Literal[
    "create_text",
    "update_text",
    "style_text",
    "add_shape",
    "add_image",
    "move_element",
    "resize_element",
    "delete_element",
    "set_background",
    "get_design_context",
    "get_selected_element",
    "batch_design_operations"
]


class TaskItem(BaseModel):
    id: str = Field(..., description="Unique task identifier, e.g. 'task_1'")
    action: AllowedAction = Field(..., description="Target Canva action/tool name")
    description: str = Field(..., description="Human-readable explanation of the task")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action-specific parameters")
    status: TaskStatus = Field(default=TaskStatus.PENDING, description="Execution status")
    error: Optional[str] = Field(default=None, description="Error message if execution failed")
    result: Optional[Dict[str, Any]] = Field(default=None, description="Execution result payload")


class Plan(BaseModel):
    goal: str = Field(..., description="High-level summary of the user's intended design goal")
    reasoning: Optional[str] = Field(default="", description="Planner's architectural/layout reasoning")
    tasks: List[TaskItem] = Field(default_factory=list, description="Ordered list of execution tasks")
    is_supported: bool = Field(default=True, description="Whether the user request is supported by Canva SDK")
    unsupported_reason: Optional[str] = Field(default=None, description="Explanation if request contains unsupported capabilities")
    suggested_alternatives: Optional[List[str]] = Field(default=None, description="Alternative suggestions for unsupported requests")


class TaskExecutionRecord(BaseModel):
    task_id: str
    action: str
    description: str
    status: TaskStatus
    tool_name: str
    input_parameters: Dict[str, Any]
    output_result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    execution_time_ms: float = 0.0


class PlanExecutionResult(BaseModel):
    success: bool
    tasks_completed: int
    tasks_failed: int
    tasks_total: int
    records: List[TaskExecutionRecord] = Field(default_factory=list)
    final_message: str
    design_delta: Optional[Dict[str, Any]] = None
