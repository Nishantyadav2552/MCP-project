"""
Abstract base class for LLM providers.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class BaseLLMProvider(ABC):
    """Abstract interface for LLM integrations."""

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: Optional[str] = None,
        temperature: float = 0.2,
        timeout: float = 60.0
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.temperature = temperature
        self.timeout = timeout

    @abstractmethod
    async def generate_text(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """Generate text completion from a list of chat messages."""
        pass

    @abstractmethod
    async def generate_structured_json(
        self,
        messages: List[Dict[str, str]],
        response_schema: Optional[Dict[str, Any]] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """Generate a valid parsed JSON dictionary matching the requested schema."""
        pass
