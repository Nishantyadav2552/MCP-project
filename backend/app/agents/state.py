"""
Conversation & Canvas State Manager.
Maintains history, design context, and semantic element mappings across multi-turn interactions.
"""
import time
import uuid
from typing import Dict, Optional, List
from app.models.state import ConversationSession, ConversationTurn
from app.models.design import DesignContext, CanvasElement
from app.models.plan import Plan, PlanExecutionResult


class StateManager:
    """Manages active conversation sessions in memory with context resolution."""

    def __init__(self):
        self._sessions: Dict[str, ConversationSession] = {}

    def get_or_create_session(self, conversation_id: Optional[str] = None) -> ConversationSession:
        """Retrieve existing session or create a new one."""
        cid = conversation_id or f"conv_{uuid.uuid4().hex[:10]}"
        if cid not in self._sessions:
            now = time.time()
            self._sessions[cid] = ConversationSession(
                conversation_id=cid,
                created_at=now,
                updated_at=now,
                current_design_context=DesignContext()
            )
        return self._sessions[cid]

    def update_session_context(self, conversation_id: str, new_context: DesignContext) -> None:
        """Update the design context stored for the session and refresh element mappings."""
        session = self.get_or_create_session(conversation_id)
        session.current_design_context = new_context
        session.updated_at = time.time()
        self._refresh_element_map(session)

    def record_turn(
        self,
        conversation_id: str,
        user_message: str,
        assistant_response: str,
        plan: Optional[Plan] = None,
        execution: Optional[PlanExecutionResult] = None,
        applied_tools: Optional[List[str]] = None
    ) -> None:
        """Record completed conversation turn."""
        session = self.get_or_create_session(conversation_id)
        turn = ConversationTurn(
            user_message=user_message,
            assistant_response=assistant_response,
            plan=plan,
            execution=execution,
            applied_tools=applied_tools or []
        )
        session.turns.append(turn)
        session.last_plan = plan
        session.updated_at = time.time()
        self._refresh_element_map(session)

    def _refresh_element_map(self, session: ConversationSession):
        """Map semantic terms ('heading', 'subtitle', 'cta', 'image') to element IDs for follow-ups."""
        el_map = {}
        for el in session.current_design_context.elements:
            title_lower = (el.title or "").lower()
            if "heading" in title_lower or "title" in title_lower:
                el_map["heading"] = el.id
                el_map["title"] = el.id
            elif "cta" in title_lower or "button" in title_lower:
                el_map["cta"] = el.id
                el_map["button"] = el.id
            elif el.type == "text" and "heading" not in el_map:
                el_map["text"] = el.id
            elif el.type == "shape":
                el_map["shape"] = el.id
            elif el.type == "image":
                el_map["image"] = el.id
                el_map["visual"] = el.id

        session.element_id_map = el_map

    def resolve_target_element_id(self, conversation_id: str, query: str) -> Optional[str]:
        """Resolve a target element ID from user wording or semantic map."""
        session = self.get_or_create_session(conversation_id)
        q = query.lower()
        for key, el_id in session.element_id_map.items():
            if key in q:
                return el_id

        # Fallback to selected element if any
        if session.current_design_context.selectedElementIds:
            return session.current_design_context.selectedElementIds[0]

        return None

    def get_trimmed_history_messages(self, conversation_id: str, max_turns: int = 5) -> List[Dict[str, str]]:
        """Return the most recent chat history formatted for LLM prompts."""
        session = self.get_or_create_session(conversation_id)
        messages = []
        recent_turns = session.turns[-max_turns:]
        for turn in recent_turns:
            messages.append({"role": "user", "content": turn.user_message})
            messages.append({"role": "assistant", "content": turn.assistant_response})
        return messages


# Global state manager instance
state_manager = StateManager()
