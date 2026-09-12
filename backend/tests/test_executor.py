"""
Unit tests for Execution Agent.
"""
import pytest
from app.agents.executor import ExecutionAgent
from app.models.plan import Plan, TaskItem, TaskStatus
from app.models.design import DesignContext, CanvasElement, TextStyle
from app.tools.registry import ToolRegistry


@pytest.mark.asyncio
async def test_executor_processes_sequential_tasks():
    plan = Plan(
        goal="Create Coffee Post",
        tasks=[
            TaskItem(
                id="task_1",
                action="set_background",
                description="Set cream background",
                parameters={"color": "#FFF8E7"}
            ),
            TaskItem(
                id="task_2",
                action="create_text",
                description="Add heading",
                parameters={"text": "Fresh Coffee", "fontSize": 48, "title": "Heading"}
            )
        ]
    )

    context = DesignContext()
    executor = ExecutionAgent()
    result = await executor.execute_plan(plan, context)

    assert result.success is True
    assert result.tasks_completed == 2
    assert result.tasks_failed == 0
    assert context.background.color == "#FFF8E7"
    assert len(context.elements) == 1
    assert context.elements[0].text == "Fresh Coffee"


@pytest.mark.asyncio
async def test_executor_handles_missing_required_arguments():
    plan = Plan(
        goal="Create invalid text",
        tasks=[
            TaskItem(
                id="task_1",
                action="create_text",
                description="Missing text content parameter",
                parameters={}  # Missing required 'text'
            )
        ]
    )

    context = DesignContext()
    executor = ExecutionAgent()
    result = await executor.execute_plan(plan, context)

    assert result.success is False
    assert result.tasks_failed == 1
    assert result.records[0].status == TaskStatus.FAILED
    assert "Missing required parameter" in result.records[0].error_message


@pytest.mark.asyncio
async def test_executor_resolves_semantic_placeholders():
    context = DesignContext(
        elements=[
            CanvasElement(
                id="el_heading_123",
                type="text",
                title="Heading",
                text="Old Heading",
                textStyle=TextStyle(fontSize=32)
            )
        ]
    )
    el_map = {"heading": "el_heading_123"}

    plan = Plan(
        goal="Make heading larger",
        tasks=[
            TaskItem(
                id="task_1",
                action="style_text",
                description="Increase font size",
                parameters={"element_id": "heading", "fontSize": 64}
            )
        ]
    )

    executor = ExecutionAgent()
    result = await executor.execute_plan(plan, context, element_id_map=el_map)

    assert result.success is True
    assert context.elements[0].textStyle.fontSize == 64
