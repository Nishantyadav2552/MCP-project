"""
Planner Agent: Analyzes user intent, checks design context, and decomposes requests into structured Pydantic Plans.
The planner MUST NOT directly execute Canva operations.
"""
import json
import logging
import time
from typing import Dict, Any, List, Optional
from app.models.plan import Plan, TaskItem, TaskStatus, AllowedAction
from app.models.design import DesignContext
from app.llm.base import BaseLLMProvider
from app.services.prompt_loader import load_prompt
from app.services.langfuse_tracer import tracer

logger = logging.getLogger("canva_agent.planner")


class PlannerAgent:
    """Agent responsible for intent analysis and task decomposition."""

    def __init__(self, llm_provider: BaseLLMProvider):
        self.llm = llm_provider

    async def create_plan(
        self,
        user_message: str,
        design_context: DesignContext,
        chat_history: Optional[List[Dict[str, str]]] = None,
        element_id_map: Optional[Dict[str, str]] = None
    ) -> Plan:
        """Analyze natural language request and generate a structured Plan."""
        start_time = time.time()
        system_prompt = load_prompt("planner_system.txt")

        # Build context briefing for the LLM
        elements_summary = []
        for el in design_context.elements:
            summary = {
                "id": el.id,
                "type": el.type,
                "title": el.title,
                "x": el.x,
                "y": el.y,
                "width": el.width,
                "height": el.height
            }
            if el.type == "text":
                summary["text"] = el.text
                summary["fontSize"] = el.textStyle.fontSize if el.textStyle else 24
                summary["color"] = el.textStyle.color if el.textStyle else "#000"
            elif el.type == "shape":
                summary["shapeType"] = el.shapeType
                summary["fillColor"] = el.shapeStyle.fillColor if el.shapeStyle else "#FFF"
            elements_summary.append(summary)

        context_brief = {
            "canvas_dimensions": {
                "width": design_context.canvasWidth,
                "height": design_context.canvasHeight,
                "unit": design_context.unit
            },
            "background": design_context.background.model_dump(),
            "active_elements": elements_summary,
            "selected_element_ids": design_context.selectedElementIds,
            "element_id_mappings": element_id_map or {}
        }

        user_prompt_content = f"""Current Canvas State:
{json.dumps(context_brief, indent=2)}

User Instruction:
"{user_message}"

Create a structured execution plan to fulfill this instruction. Ensure each task uses only allowed Canva actions."""

        messages = [{"role": "system", "content": system_prompt}]
        if chat_history:
            messages.extend(chat_history)
        messages.append({"role": "user", "content": user_prompt_content})

        try:
            raw_response = await self.llm.generate_structured_json(messages)
            plan = self._parse_and_validate_plan(raw_response, user_message, design_context)

            duration_ms = (time.time() - start_time) * 1000
            tracer.trace_generation(
                name="planner_agent",
                input_data={"user_message": user_message, "context": context_brief},
                output_data=plan.model_dump(),
                duration_ms=duration_ms
            )
            return plan

        except Exception as e:
            logger.warning(f"Planner LLM failed or generated invalid schema: {e}. Executing heuristic plan generator.")
            # Graceful fallback heuristic planner so the user experience never breaks
            duration_ms = (time.time() - start_time) * 1000
            fallback_plan = self._generate_heuristic_plan(user_message, design_context, element_id_map)
            tracer.trace_generation(
                name="planner_agent_fallback",
                input_data={"user_message": user_message},
                output_data=fallback_plan.model_dump(),
                duration_ms=duration_ms,
                error=str(e)
            )
            return fallback_plan

    def _parse_and_validate_plan(
        self,
        raw_dict: Dict[str, Any],
        user_message: str,
        design_context: DesignContext
    ) -> Plan:
        """Validate raw dictionary into strongly-typed Plan."""
        goal = raw_dict.get("goal") or f"Process: {user_message}"
        reasoning = raw_dict.get("reasoning", "")
        is_supported = raw_dict.get("is_supported", True)
        unsupported_reason = raw_dict.get("unsupported_reason")
        suggested_alternatives = raw_dict.get("suggested_alternatives")

        tasks_data = raw_dict.get("tasks", [])
        validated_tasks: List[TaskItem] = []

        allowed_actions = {
            "create_text", "update_text", "style_text", "add_shape", "add_image",
            "move_element", "resize_element", "delete_element", "set_background",
            "get_design_context", "get_selected_element", "batch_design_operations"
        }

        for i, t in enumerate(tasks_data):
            action = t.get("action")
            if action not in allowed_actions:
                logger.warning(f"Skipping task with unknown action '{action}'")
                continue

            task_id = t.get("id") or f"task_{i + 1}"
            description = t.get("description") or f"Execute {action}"
            params = t.get("parameters", {})

            validated_tasks.append(
                TaskItem(
                    id=task_id,
                    action=action,  # type: ignore
                    description=description,
                    parameters=params,
                    status=TaskStatus.PENDING
                )
            )

        return Plan(
            goal=goal,
            reasoning=reasoning,
            is_supported=is_supported,
            unsupported_reason=unsupported_reason,
            suggested_alternatives=suggested_alternatives,
            tasks=validated_tasks
        )

    def _generate_heuristic_plan(
        self,
        user_message: str,
        design_context: DesignContext,
        element_id_map: Optional[Dict[str, str]] = None
    ) -> Plan:
        """Deterministic fallback rule-based planner for standard requests or when offline."""
        msg_lower = user_message.lower()
        tasks: List[TaskItem] = []
        cw = design_context.canvasWidth
        ch = design_context.canvasHeight

        # Detect unsupported requests
        if any(unsupported in msg_lower for unsupported in ["3d model", "video editor", "sql query", "execute python", "hack"]):
            return Plan(
                goal=user_message,
                is_supported=False,
                unsupported_reason="This operation is not currently supported by the available Canva API.",
                suggested_alternatives=["Create 2D vector graphics", "Add modern typography", "Apply styled Canva layout templates"],
                tasks=[]
            )

        # 1. Instagram / Poster / Coffee shop creation
        if any(kw in msg_lower for kw in ["coffee", "poster", "instagram", "create", "start from scratch"]):
            tasks.append(
                TaskItem(
                    id="task_1",
                    action="set_background",
                    description="Set warm cream background for coffee theme",
                    parameters={"color": "#FFFDF9"}
                )
            )
            tasks.append(
                TaskItem(
                    id="task_2",
                    action="create_text",
                    description="Add main heading 'Fresh Coffee Every Morning'",
                    parameters={
                        "text": "Fresh Coffee Every Morning",
                        "fontSize": 56,
                        "fontFamily": "Playfair Display",
                        "color": "#2B1704",
                        "textAlign": "center",
                        "fontWeight": "bold",
                        "y": 120,
                        "title": "Main Heading"
                    }
                )
            )
            tasks.append(
                TaskItem(
                    id="task_3",
                    action="add_image",
                    description="Add coffee visual hero image",
                    parameters={
                        "altText": "A cup of warm espresso coffee with latte art",
                        "title": "Coffee Visual",
                        "width": 550,
                        "height": 400,
                        "y": 280
                    }
                )
            )
            tasks.append(
                TaskItem(
                    id="task_4",
                    action="add_shape",
                    description="Add CTA button pill background",
                    parameters={
                        "shapeType": "pill",
                        "fillColor": "#D97706",
                        "width": 260,
                        "height": 64,
                        "y": 760,
                        "title": "CTA Container"
                    }
                )
            )
            tasks.append(
                TaskItem(
                    id="task_5",
                    action="create_text",
                    description="Add CTA button label 'Visit Us Today'",
                    parameters={
                        "text": "Visit Us Today",
                        "fontSize": 22,
                        "fontFamily": "Montserrat",
                        "color": "#FFFFFF",
                        "textAlign": "center",
                        "fontWeight": "bold",
                        "y": 778,
                        "title": "CTA Label"
                    }
                )
            )
            return Plan(
                goal="Create modern coffee shop design layout",
                reasoning="Warm coffee palette with hero typography, visual centerpiece, and CTA pill button.",
                tasks=tasks
            )

        # 2. Heading modification follow-up: "Make the heading larger and move to center"
        if "heading" in msg_lower or "title" in msg_lower:
            target_id = None
            if element_id_map and "heading" in element_id_map:
                target_id = element_id_map["heading"]
            elif design_context.elements:
                for el in design_context.elements:
                    if el.type == "text":
                        target_id = el.id
                        break

            if "larger" in msg_lower or "bigger" in msg_lower:
                tasks.append(
                    TaskItem(
                        id=f"task_{len(tasks)+1}",
                        action="style_text",
                        description="Increase font size of heading",
                        parameters={"element_id": target_id or "heading_target", "fontSize": 68}
                    )
                )
            if "center" in msg_lower or "middle" in msg_lower:
                tasks.append(
                    TaskItem(
                        id=f"task_{len(tasks)+1}",
                        action="move_element",
                        description="Move heading to center alignment",
                        parameters={"element_id": target_id or "heading_target", "placement": "center"}
                    )
                )
            if tasks:
                return Plan(
                    goal="Update heading typography and placement",
                    reasoning="Modify existing heading element properties from context.",
                    tasks=tasks
                )

        # 3. Background change: "Change background"
        if "background" in msg_lower or "bg" in msg_lower:
            color = "#F3F4F6"
            if "dark" in msg_lower or "black" in msg_lower:
                color = "#111827"
            elif "light" in msg_lower or "white" in msg_lower:
                color = "#FFFFFF"
            elif "warm" in msg_lower or "yellow" in msg_lower:
                color = "#FEF3C7"
            elif "blue" in msg_lower:
                color = "#E0F2FE"

            return Plan(
                goal="Update canvas background",
                tasks=[
                    TaskItem(
                        id="task_1",
                        action="set_background",
                        description=f"Change canvas background color to {color}",
                        parameters={"color": color}
                    )
                ]
            )

        # 4. Remove / Delete element
        if "delete" in msg_lower or "remove" in msg_lower:
            target_id = None
            if element_id_map:
                for k, v in element_id_map.items():
                    if k in msg_lower:
                        target_id = v
                        break
            return Plan(
                goal="Delete element from design",
                tasks=[
                    TaskItem(
                        id="task_1",
                        action="delete_element",
                        description="Remove target element from canvas",
                        parameters={"element_id": target_id}
                    )
                ]
            )

        # Default text addition
        return Plan(
            goal="Add requested design element",
            tasks=[
                TaskItem(
                    id="task_1",
                    action="create_text",
                    description=f"Add text element for '{user_message}'",
                    parameters={"text": user_message, "fontSize": 32, "textAlign": "center"}
                )
            ]
        )
