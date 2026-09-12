"""
Unit tests for StateManager and multi-turn context retention.
"""
from app.agents.state import StateManager
from app.models.design import DesignContext, CanvasElement, TextStyle
from app.models.plan import Plan, PlanExecutionResult


def test_state_manager_creates_and_tracks_sessions():
    mgr = StateManager()
    session = mgr.get_or_create_session("session_1")
    assert session.conversation_id == "session_1"
    assert len(session.turns) == 0


def test_state_manager_element_semantic_mapping():
    mgr = StateManager()
    session = mgr.get_or_create_session("session_2")

    ctx = DesignContext(
        elements=[
            CanvasElement(
                id="el_heading_1",
                type="text",
                title="Main Heading",
                text="Hello World"
            ),
            CanvasElement(
                id="el_cta_btn",
                type="text",
                title="CTA Button",
                text="Click Here"
            )
        ]
    )

    mgr.update_session_context("session_2", ctx)
    assert mgr.resolve_target_element_id("session_2", "make the heading larger") == "el_heading_1"
    assert mgr.resolve_target_element_id("session_2", "move CTA button to bottom") == "el_cta_btn"


def test_state_manager_records_turn_history():
    mgr = StateManager()
    plan = Plan(goal="Create test design", tasks=[])
    exec_res = PlanExecutionResult(
        success=True,
        tasks_completed=1,
        tasks_failed=0,
        tasks_total=1,
        final_message="Done"
    )

    mgr.record_turn(
        conversation_id="session_3",
        user_message="Create test",
        assistant_response="Done",
        plan=plan,
        execution=exec_res,
        applied_tools=["create_text"]
    )

    history = mgr.get_trimmed_history_messages("session_3")
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[0]["content"] == "Create test"
    assert history[1]["role"] == "assistant"
