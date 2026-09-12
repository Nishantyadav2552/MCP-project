"""
OpenAI-Compatible LLM Provider implementation using httpx.
Works with OpenAI, Groq, Ollama, LMStudio, vLLM, and any OpenAI-compatible API.
"""
import json
import logging
import re
import httpx
from typing import List, Dict, Any, Optional
from app.llm.base import BaseLLMProvider

logger = logging.getLogger("canva_agent.llm")


def extract_json_from_text(text: str) -> Dict[str, Any]:
    """Robustly extract and parse JSON object from raw LLM text with markdown fences or free text."""
    text = text.strip()
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting markdown json code block ```json ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try finding outermost { ... }
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace:last_brace + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse valid JSON from LLM response: {text[:200]}...")


class CompatibleProvider(BaseLLMProvider):
    """Universal OpenAI-compatible API client."""

    def __init__(
        self,
        api_key: str = "",
        model: str = "gpt-4o-mini",
        base_url: str = "https://api.openai.com/v1",
        temperature: float = 0.2,
        timeout: float = 60.0
    ):
        super().__init__(api_key, model, base_url, temperature, timeout)
        self.endpoint = f"{self.base_url.rstrip('/')}/chat/completions"

    async def generate_text(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.endpoint, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return content or ""
            except httpx.HTTPStatusError as e:
                logger.error(f"LLM HTTP Error {e.response.status_code}: {e.response.text}")
                raise RuntimeError(f"LLM request failed: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                logger.error(f"LLM Request failed: {e}")
                raise RuntimeError(f"LLM network failure: {e}")

    async def generate_structured_json(
        self,
        messages: List[Dict[str, str]],
        response_schema: Optional[Dict[str, Any]] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        # Add instruction to strictly return JSON
        system_json_hint = "\n\nCRITICAL: Respond ONLY with valid JSON. Do not include introductory text or trailing commentary."
        modified_messages = list(messages)
        
        # Check if json_object format is supported by adding response_format if compatible
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": modified_messages,
            "temperature": temperature if temperature is not None else self.temperature,
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                # First attempt with json_object format
                response = await client.post(self.endpoint, headers=headers, json=payload)
                if response.status_code in (400, 422):
                    # Some endpoints don't support response_format; fallback without it
                    payload.pop("response_format", None)
                    response = await client.post(self.endpoint, headers=headers, json=payload)
                
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return extract_json_from_text(content)
            except Exception as e:
                logger.error(f"Error during structured JSON generation: {e}")
                raise
