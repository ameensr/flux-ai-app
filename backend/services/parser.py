"""
Context-Aware Parser — two-stage pipeline:
  Stage 1: Extract a Requirement Map (Entities, Actions, Constraints)
  Stage 2: Generate grounded test cases from the Map
"""
import json
from typing import AsyncIterator

from services.llm import chat_complete, chat_stream
from services.pii import mask_pii

CHUNK_SIZE = 1500
CHUNK_OVERLAP = 200

_EXTRACTION_SYSTEM = """You are a Business Analyst assistant.
Extract a structured Requirement Map from the provided text.
Return ONLY valid JSON with this exact shape:
{
  "entities": ["<noun phrases that are system actors or objects>"],
  "actions": ["<verb phrases describing system behaviour>"],
  "constraints": ["<rules, limits, conditions, non-functional requirements>"]
}
Do NOT invent anything not explicitly stated in the text."""

_GENERATION_SYSTEM = """You are a senior QA engineer.
You will receive a Requirement Map (JSON) and must generate test cases STRICTLY
based on that map. You MUST NOT invent features, flows, or behaviours that are
absent from the map.

Rules:
- Every test case "objective" MUST start with "Verify that"
- "steps" MUST be a numbered line-by-line list (plain strings, no sub-bullets)
- Return ONLY a valid JSON array, no markdown fences, no explanation.

Shape of each test case:
{
  "id": "TC-001",
  "objective": "Verify that ...",
  "priority": "High|Medium|Low",
  "preconditions": ["..."],
  "steps": ["1. ...", "2. ...", "3. ..."],
  "expected_result": "..."
}"""


def _split_text(text: str) -> list[str]:
    size = CHUNK_SIZE * 4
    overlap = CHUNK_OVERLAP * 4
    if len(text) <= size:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = end - overlap
    return chunks


def _merge_maps(maps: list[dict]) -> dict:
    merged: dict[str, set] = {"entities": set(), "actions": set(), "constraints": set()}
    for m in maps:
        for key in merged:
            merged[key].update(m.get(key, []))
    return {k: sorted(v) for k, v in merged.items()}


async def extract_requirement_map(text: str, **llm) -> dict:
    masked_text, _ = mask_pii(text)
    chunks = _split_text(masked_text)
    maps: list[dict] = []

    for chunk in chunks:
        try:
            content = await chat_complete(
                **llm,
                prompt=chunk,
                system_prompt=_EXTRACTION_SYSTEM,
                temperature=0.2,
                max_tokens=1024,
            )
            maps.append(json.loads(content))
        except (json.JSONDecodeError, ValueError):
            pass

    return _merge_maps(maps) if maps else {"entities": [], "actions": [], "constraints": []}


async def generate_test_cases_stream(requirement_map: dict, **llm) -> AsyncIterator[str]:
    prompt = f"Requirement Map:\n{json.dumps(requirement_map, indent=2)}"
    async for chunk in chat_stream(
        **llm,
        prompt=prompt,
        system_prompt=_GENERATION_SYSTEM,
        temperature=0.2,
        max_tokens=3072,
    ):
        yield chunk


async def run_full_pipeline(text: str, **llm) -> tuple[dict, list[dict]]:
    req_map = await extract_requirement_map(text, **llm)
    content = await chat_complete(
        **llm,
        prompt=f"Requirement Map:\n{json.dumps(req_map, indent=2)}",
        system_prompt=_GENERATION_SYSTEM,
        temperature=0.2,
        max_tokens=3072,
    )
    test_cases = json.loads(content)
    return req_map, test_cases
