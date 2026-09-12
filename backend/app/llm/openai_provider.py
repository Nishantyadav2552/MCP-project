"""
OpenAI LLM Provider.
"""
from typing import Optional
from app.llm.compatible_provider import CompatibleProvider


class OpenAIProvider(CompatibleProvider):
    """OpenAI API provider for GPT-4o, GPT-4o-mini, etc."""

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        base_url: Optional[str] = None,
        temperature: float = 0.2,
        timeout: float = 60.0
    ):
        url = base_url or "https://api.openai.com/v1"
        super().__init__(api_key=api_key, model=model, base_url=url, temperature=temperature, timeout=timeout)
