"""
Execution Agent: Sequentially executes validated tasks using registered Canva tools.
Reports exact execution statuses and records design deltas.
"""
import logging
import time
from typing import Dict, Any, List, Optional
from app.models.plan import Plan, TaskItem, TaskStatus, PlanExecutionResult, TaskExecutionRecord
from app.models.design import DesignContext
from app.models.tool import ToolResult
from app.tools.registry import ToolRegistry, registry
from app.services.langfuse_tracer import tracer

logger = logging.getLogger("canva_agent.executor")


class ExecutionAgent:
    """Agent responsible for sequential tool selection, argument validation, and execution."""

    def __init__(self, tool_registry: Optional[ToolRegistry] = None):
        self.registry = tool_registry or registry

    async def execute_plan(
        self,
        plan: Plan,
        design_context: DesignContext,
        element_id_map: Optional[Dict[str, str]] = None
    ) -> PlanExecutionResult:
        """Execute all tasks in the plan sequentially against the Canva design context."""
        start_time = time.time()
        records: List[TaskExecutionRecord] = []
        completed_count = 0
        failed_count = 0
        total_tasks = len(plan.tasks)

        if not plan.is_supported:
            return PlanExecutionResult(
                success=False,
                tasks_completed=0,
                tasks_failed=0,
                tasks_total=0,
                records=[],
                final_message=plan.unsupported_reason or "This operation is not supported by Canva SDK.",
                design_delta=None
            )

        for task in plan.tasks:
            task.status = TaskStatus.IN_PROGRESS
            task_start = time.time()

            # Parameter resolution (e.g. resolve semantic element ID from element map)
            resolved_params = self._resolve_parameters(task.parameters, design_context, element_id_map)

            logger.info(f"[EXECUTOR] Executing {task.id} -> Tool: {task.action} with params: {resolved_params}")

            # Execute via Tool Registry
            tool_result: ToolResult = await self.registry.execute_tool(
                name=task.action,
                arguments=resolved_params,
                context=design_context
            )

            task_duration = (time.time() - task_start) * 1000

            if tool_result.success:
                task.status = TaskStatus.COMPLETED
                task.result = tool_result.result
                completed_count += 1
                record = TaskExecutionRecord(
                    task_id=task.id,
                    action=task.action,
                    description=task.description,
                    status=TaskStatus.COMPLETED,
                    tool_name=task.action,
                    input_parameters=resolved_params,
                    output_result=tool_result.result,
                    execution_time_ms=task_duration
                )
                records.append(record)

                # Keep track of newly created element ID if applicable
                if tool_result.result and "element_id" in tool_result.result:
                    el_id = tool_result.result["element_id"]
                    title = tool_result.result.get("title", "")
                    if element_id_map is not None:
                        if "heading" in title.lower() or "title" in title.lower():
                            element_id_map["heading"] = el_id
                        elif "cta" in title.lower():
                            element_id_map["cta"] = el_id

            else:
                task.status = TaskStatus.FAILED
                err_msg = tool_result.error.message if tool_result.error else "Unknown execution error"
                task.error = err_msg
                failed_count += 1
                record = TaskExecutionRecord(
                    task_id=task.id,
                    action=task.action,
                    description=task.description,
                    status=TaskStatus.FAILED,
                    tool_name=task.action,
                    input_parameters=resolved_params,
                    error_message=err_msg,
                    execution_time_ms=task_duration
                )
                records.append(record)
                logger.error(f"[EXECUTOR] Task {task.id} failed: {err_msg}")

        overall_success = (failed_count == 0) and (completed_count > 0)
        final_msg = (
            f"Successfully executed {completed_count}/{total_tasks} design operations."
            if overall_success
            else f"Executed with {completed_count} succeeded, {failed_count} failed."
        )

        exec_result = PlanExecutionResult(
            success=overall_success,
            tasks_completed=completed_count,
            tasks_failed=failed_count,
            tasks_total=total_tasks,
            records=records,
            final_message=final_msg,
            design_delta={"element_count": len(design_context.elements)}
        )

        tracer.trace_generation(
            name="execution_agent",
            input_data={"plan_goal": plan.goal, "task_count": total_tasks},
            output_data=exec_result.model_dump(),
            duration_ms=(time.time() - start_time) * 1000
        )

        return exec_result

    def _resolve_parameters(
        self,
        parameters: Dict[str, Any],
        context: DesignContext,
        element_id_map: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Sanitize parameters and resolve semantic placeholders to actual element IDs."""
        resolved = dict(parameters)

        if "element_id" in resolved:
            target = str(resolved["element_id"])
            # If target looks like a placeholder e.g. "heading_target", "heading", "selected"
            if target in ("heading_target", "heading", "title"):
                if element_id_map and "heading" in element_id_map:
                    resolved["element_id"] = element_id_map["heading"]
                else:
                    text_els = context.get_elements_by_type("text")
                    if text_els:
                        resolved["element_id"] = text_els[0].id
            elif target in ("cta_target", "cta", "button"):
                if element_id_map and "cta" in element_id_map:
                    resolved["element_id"] = element_id_map["cta"]
            elif target in ("selected", "selected_element") and context.selectedElementIds:
                resolved["element_id"] = context.selectedElementIds[0]

        return resolved
