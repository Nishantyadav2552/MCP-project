"""
Groq LLM Provider.
"""
from typing import Optional
from app.llm.compatible_provider import CompatibleProvider


class GroqProvider(CompatibleProvider):
    """Groq API provider for ultra-fast Llama-3, etc."""

    def __init__(
        self,
        api_key: str,
        model: str = "llama-3.3-70b-versatile",
        base_url: Optional[str] = None,
        temperature: float = 0.2,
        timeout: float = 60.0
    ):
        url = base_url or "https://api.groq.com/openai/v1"
        super().__init__(api_key=api_key, model=model, base_url=url, temperature=temperature, timeout=timeout)
