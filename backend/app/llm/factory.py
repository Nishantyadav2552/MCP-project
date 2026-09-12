"""
Factory for creating configured LLM provider instances.
"""
import logging
from typing import Optional
from app.config import settings
from app.llm.base import BaseLLMProvider
from app.llm.openai_provider import OpenAIProvider
from app.llm.groq_provider import GroqProvider
from app.llm.compatible_provider import CompatibleProvider

logger = logging.getLogger("canva_agent.llm_factory")


def get_llm_provider(
    provider_type: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    base_url: Optional[str] = None,
    temperature: Optional[float] = None,
    timeout: Optional[float] = None
) -> BaseLLMProvider:
    """Instantiate and return the appropriate LLM provider according to configuration."""
    ptype = (provider_type or settings.LLM_PROVIDER or "compatible").lower()
    key = api_key if api_key is not None else settings.LLM_API_KEY
    mdl = model or settings.LLM_MODEL or "gpt-4o-mini"
    burl = base_url or settings.LLM_BASE_URL
    temp = temperature if temperature is not None else settings.LLM_TEMPERATURE
    tout = timeout if timeout is not None else settings.LLM_TIMEOUT_SECONDS

    if ptype == "openai":
        return OpenAIProvider(api_key=key, model=mdl, base_url=burl, temperature=temp, timeout=tout)
    elif ptype == "groq":
        return GroqProvider(api_key=key, model=mdl, base_url=burl, temperature=temp, timeout=tout)
    else:
        return CompatibleProvider(api_key=key, model=mdl, base_url=burl, temperature=temp, timeout=tout)
