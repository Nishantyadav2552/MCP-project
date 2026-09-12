"""
Observability and tracing service supporting Langfuse with safe, graceful fallback.
"""
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("canva_agent.tracer")


class AgentTracer:
    """Agent execution tracer. Seamlessly logs if Langfuse is disabled or errors."""

    def __init__(self):
        self.enabled = settings.LANGFUSE_ENABLED and bool(settings.LANGFUSE_PUBLIC_KEY)
        self.client = None
        if self.enabled:
            try:
                from langfuse import Langfuse
                self.client = Langfuse(
                    public_key=settings.LANGFUSE_PUBLIC_KEY,
                    secret_key=settings.LANGFUSE_SECRET_KEY,
                    host=settings.LANGFUSE_HOST,
                )
                logger.info("Langfuse observability initialized successfully.")
            except Exception as e:
                logger.warning(f"Could not initialize Langfuse: {e}. Falling back to structured logging.")
                self.enabled = False

    def trace_generation(
        self,
        name: str,
        input_data: Any,
        output_data: Any,
        metadata: Optional[Dict[str, Any]] = None,
        duration_ms: float = 0.0,
        error: Optional[str] = None
    ):
        """Record an LLM generation or agent step trace."""
        log_payload = {
            "trace_step": name,
            "duration_ms": duration_ms,
            "metadata": metadata or {},
            "status": "error" if error else "success"
        }
        if error:
            log_payload["error"] = error
            logger.error(f"[TRACER] {name} failed: {error} | {log_payload}")
        else:
            logger.info(f"[TRACER] {name} completed in {duration_ms:.1f}ms | {log_payload}")

        if self.enabled and self.client:
            try:
                # Dispatch trace asynchronously
                trace = self.client.trace(name=name, metadata=metadata or {})
                trace.generation(
                    name=name,
                    input=input_data,
                    output=output_data,
                    status_message=error,
                    level="ERROR" if error else "DEFAULT"
                )
            except Exception as e:
                logger.debug(f"Langfuse dispatch error: {e}")


# Global tracer instance
tracer = AgentTracer()
