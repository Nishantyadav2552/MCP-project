"""
Unit tests for Planner Agent.
"""
import pytest
from app.agents.planner import PlannerAgent
from app.models.design import DesignContext, CanvasElement, TextStyle
from app.llm.base import BaseLLMProvider


class MockLLMProvider(BaseLLMProvider):
    """Mock LLM provider returning predetermined JSON plans."""

    def __init__(self, response_payload: dict):
        super().__init__(api_key="mock", model="mock")
        self.response_payload = response_payload

    async def generate_text(self, messages, temperature=None, max_tokens=None) -> str:
        return "mock"

    async def generate_structured_json(self, messages, response_schema=None, temperature=None) -> dict:
        return self.response_payload


@pytest.mark.asyncio
async def test_planner_creates_valid_plan():
    mock_response = {
        "goal": "Create a coffee shop Instagram post",
        "reasoning": "Modern espresso theme with clear typography and hero visual",
        "is_supported": True,
        "tasks": [
            {
                "id": "task_1",
                "action": "create_text",
                "description": "Add heading 'Fresh Coffee Every Morning'",
                "parameters": {"text": "Fresh Coffee Every Morning", "fontSize": 48}
            },
            {
                "id": "task_2",
                "action": "add_shape",
                "description": "Add CTA button container",
                "parameters": {"shapeType": "pill", "fillColor": "#D97706"}
            }
        ]
    }

    planner = PlannerAgent(MockLLMProvider(mock_response))
    context = DesignContext()
    plan = await planner.create_plan(
        user_message="Create a coffee shop post",
        design_context=context
    )

    assert plan.goal == "Create a coffee shop Instagram post"
    assert plan.is_supported is True
    assert len(plan.tasks) == 2
    assert plan.tasks[0].action == "create_text"
    assert plan.tasks[0].parameters["text"] == "Fresh Coffee Every Morning"
    assert plan.tasks[1].action == "add_shape"


@pytest.mark.asyncio
async def test_planner_handles_unsupported_operation():
    mock_response = {
        "goal": "3D mesh generation",
        "is_supported": False,
        "unsupported_reason": "This operation is not currently supported by the available Canva API.",
        "suggested_alternatives": ["Add 2D vector graphic", "Add high-resolution image asset"],
        "tasks": []
    }

    planner = PlannerAgent(MockLLMProvider(mock_response))
    plan = await planner.create_plan(
        user_message="Sculpt a 3D animated mesh",
        design_context=DesignContext()
    )

    assert plan.is_supported is False
    assert "not currently supported" in plan.unsupported_reason
    assert len(plan.suggested_alternatives) == 2
    assert len(plan.tasks) == 0


@pytest.mark.asyncio
async def test_planner_filters_unregistered_actions():
    mock_response = {
        "goal": "Test filtering",
        "tasks": [
            {"id": "t1", "action": "create_text", "description": "valid", "parameters": {"text": "Hello"}},
            {"id": "t2", "action": "fake_magic_ai_action", "description": "invalid", "parameters": {}},
            {"id": "t3", "action": "set_background", "description": "valid", "parameters": {"color": "#FFF"}}
        ]
    }

    planner = PlannerAgent(MockLLMProvider(mock_response))
    plan = await planner.create_plan(
        user_message="Test action filtering",
        design_context=DesignContext()
    )

    # Fake action should be excluded by the planner validator
    assert len(plan.tasks) == 2
    actions = [t.action for t in plan.tasks]
    assert "fake_magic_ai_action" not in actions
    assert "create_text" in actions
    assert "set_background" in actions
