"""
Unit tests for LLM provider abstraction and JSON parsing.
"""
import pytest
from app.llm.factory import get_llm_provider
from app.llm.openai_provider import OpenAIProvider
from app.llm.groq_provider import GroqProvider
from app.llm.compatible_provider import CompatibleProvider, extract_json_from_text


def test_llm_factory_instantiates_providers():
    p_openai = get_llm_provider("openai", api_key="sk-test", model="gpt-4o")
    assert isinstance(p_openai, OpenAIProvider)
    assert p_openai.model == "gpt-4o"

    p_groq = get_llm_provider("groq", api_key="gsk-test", model="llama-3.3-70b-versatile")
    assert isinstance(p_groq, GroqProvider)
    assert p_groq.model == "llama-3.3-70b-versatile"

    p_comp = get_llm_provider("compatible", api_key="test", base_url="http://localhost:11434/v1")
    assert isinstance(p_comp, CompatibleProvider)


def test_extract_json_from_text_formats():
    # 1. Clean JSON
    raw1 = '{"goal": "Create poster", "tasks": []}'
    parsed1 = extract_json_from_text(raw1)
    assert parsed1["goal"] == "Create poster"

    # 2. Markdown fenced JSON
    raw2 = 'Here is the plan:\n```json\n{"goal": "Fenced Plan", "tasks": [{"id": "1"}]}\n```\nHope this helps!'
    parsed2 = extract_json_from_text(raw2)
    assert parsed2["goal"] == "Fenced Plan"
    assert len(parsed2["tasks"]) == 1

    # 3. Outer text with braces
    raw3 = 'Sure thing! {"goal": "Embedded Plan", "tasks": []} enjoy!'
    parsed3 = extract_json_from_text(raw3)
    assert parsed3["goal"] == "Embedded Plan"
