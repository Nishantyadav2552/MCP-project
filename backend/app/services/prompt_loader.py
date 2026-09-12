"""
Prompt loader service for reading external prompt template files.
"""
import os
from pathlib import Path
from functools import lru_cache

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


@lru_cache(maxsize=10)
def load_prompt(filename: str) -> str:
    """Load a system prompt template from the prompts directory with caching."""
    filepath = PROMPTS_DIR / filename
    if not filepath.exists():
        raise FileNotFoundError(f"Prompt file {filename} not found at {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read().strip()
