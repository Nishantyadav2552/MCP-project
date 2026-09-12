"""
Agent Orchestrator: Coordinates the full pipeline:
Request -> Design Context -> Planner Agent -> Plan Validation -> Execution Agent -> State Update -> Output.
"""
import logging
import uuid
from typing import Dict, Any, Optional, List
from app.models.chat import ChatRequest, ChatResponse
from app.models.plan import Plan, PlanExecutionResult
from app.models.design import DesignContext
from app.agents.state import state_manager
from app.agents.planner import PlannerAgent
from app.agents.executor import ExecutionAgent
from app.llm.factory import get_llm_provider
from app.tools.registry import registry

logger = logging.getLogger("canva_agent.orchestrator")


class AgentOrchestrator:
    """End-to-end agent workflow orchestrator."""

    def __init__(self):
        self.llm = get_llm_provider()
        self.planner = PlannerAgent(self.llm)
        self.executor = ExecutionAgent(registry)
        self.state_mgr = state_manager

    async def handle_chat_request(self, request: ChatRequest) -> ChatResponse:
        """Process incoming user chat message through Planner and Execution agents."""
        cid = request.conversation_id or f"conv_{uuid.uuid4().hex[:10]}"
        session = self.state_mgr.get_or_create_session(cid)

        # Merge or synchronize design context from frontend
        active_context = request.design_context or session.current_design_context
        session.current_design_context = active_context

        # Fetch recent chat history
        history = self.state_mgr.get_trimmed_history_messages(cid)

        # Step 1: Run Planner Agent
        plan: Plan = await self.planner.create_plan(
            user_message=request.message,
            design_context=active_context,
            chat_history=history,
            element_id_map=session.element_id_map
        )

        applied_operations: List[Dict[str, Any]] = []
        execution_result: Optional[PlanExecutionResult] = None
        assistant_message = ""

        # Check if plan contains unsupported capabilities
        if not plan.is_supported:
            assistant_message = plan.unsupported_reason or "This operation is not currently supported by the available Canva API."
            if plan.suggested_alternatives:
                assistant_message += "\n\nSuggested alternatives:\n" + "\n".join(f"- {alt}" for alt in plan.suggested_alternatives)
        elif request.auto_execute and plan.tasks:
            # Step 2: Run Execution Agent
            execution_result = await self.executor.execute_plan(
                plan=plan,
                design_context=active_context,
                element_id_map=session.element_id_map
            )

            for rec in execution_result.records:
                if rec.status == "completed":
                    applied_operations.append({
                        "tool": rec.tool_name,
                        "parameters": rec.input_parameters,
                        "result": rec.output_result
                    })

            if execution_result.success:
                assistant_message = f"I've updated your design: {plan.goal}. {execution_result.final_message}"
            else:
                assistant_message = f"Partially completed: {execution_result.final_message}"
        else:
            assistant_message = f"Plan created: {plan.goal} with {len(plan.tasks)} tasks ready for execution."

        # Step 3: Update session state
        applied_tool_names = [op["tool"] for op in applied_operations]
        self.state_mgr.record_turn(
            conversation_id=cid,
            user_message=request.message,
            assistant_response=assistant_message,
            plan=plan,
            execution=execution_result,
            applied_tools=applied_tool_names
        )
        self.state_mgr.update_session_context(cid, active_context)

        return ChatResponse(
            conversation_id=cid,
            message=assistant_message,
            plan=plan,
            execution=execution_result,
            updated_design_context=active_context,
            applied_operations=applied_operations
        )

    async def handle_plan_only(self, message: str, design_context: Optional[DesignContext] = None, conversation_id: Optional[str] = None) -> Plan:
        """Generate a structured plan without executing it."""
        cid = conversation_id or f"conv_{uuid.uuid4().hex[:10]}"
        session = self.state_mgr.get_or_create_session(cid)
        ctx = design_context or session.current_design_context
        history = self.state_mgr.get_trimmed_history_messages(cid)

        return await self.planner.create_plan(
            user_message=message,
            design_context=ctx,
            chat_history=history,
            element_id_map=session.element_id_map
        )

    async def handle_execute_only(self, plan: Plan, design_context: Optional[DesignContext] = None, conversation_id: Optional[str] = None) -> PlanExecutionResult:
        """Execute a previously validated plan."""
        cid = conversation_id or f"conv_{uuid.uuid4().hex[:10]}"
        session = self.state_mgr.get_or_create_session(cid)
        ctx = design_context or session.current_design_context

        return await self.executor.execute_plan(
            plan=plan,
            design_context=ctx,
            element_id_map=session.element_id_map
        )


# Global orchestrator instance
orchestrator = AgentOrchestrator()
