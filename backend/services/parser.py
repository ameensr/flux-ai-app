"""
Context-Aware Parser — two-stage pipeline:
  Stage 1: Extract a Requirement Map (Entities, Actions, Constraints)
  Stage 2: Generate grounded test cases from the Map

RAG / Sliding-Window: documents exceeding CHUNK_TOKEN_LIMIT are split into
overlapping chunks; each chunk produces its own Map, then Maps are merged
before Stage 2 runs — keeping the final generation call within token budget.
"""
import json
from typing import AsyncIterator

from langchain_openai import ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document

from .pii import mask_pii

# ── Config ────────────────────────────────────────────────────────────────────

CHUNK_SIZE = 1500          # tokens (approx chars / 4)
CHUNK_OVERLAP = 200
RAG_TOP_K = 6              # chunks retrieved per query when doc is huge

# ── Prompts ───────────────────────────────────────────────────────────────────

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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_llm(api_key: str, streaming: bool = False) -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        api_key=api_key,
        temperature=0.2,
        streaming=streaming,
    )


def _splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE * 4,   # chars ≈ tokens * 4
        chunk_overlap=CHUNK_OVERLAP * 4,
    )


def _merge_maps(maps: list[dict]) -> dict:
    """Deduplicate and merge multiple Requirement Maps into one."""
    merged: dict[str, set] = {"entities": set(), "actions": set(), "constraints": set()}
    for m in maps:
        for key in merged:
            merged[key].update(m.get(key, []))
    return {k: sorted(v) for k, v in merged.items()}


# ── Stage 1: Extraction ───────────────────────────────────────────────────────

async def extract_requirement_map(text: str, api_key: str) -> dict:
    """
    Splits long docs into chunks, extracts a Requirement Map per chunk,
    then merges. Short docs are processed in a single call.
    """
    masked_text, _ = mask_pii(text)
    chunks = _splitter().split_text(masked_text)

    llm = _make_llm(api_key)
    maps: list[dict] = []

    for chunk in chunks:
        response = await llm.ainvoke([
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {"role": "user", "content": chunk},
        ])
        try:
            maps.append(json.loads(response.content))
        except json.JSONDecodeError:
            # Best-effort: skip malformed chunk responses
            pass

    return _merge_maps(maps) if maps else {"entities": [], "actions": [], "constraints": []}


# ── RAG retrieval (for very large PRDs) ──────────────────────────────────────

async def build_rag_store(text: str, api_key: str) -> FAISS:
    """Build an in-memory FAISS vector store from document chunks."""
    chunks = _splitter().split_text(text)
    docs = [Document(page_content=c) for c in chunks]
    embeddings = OpenAIEmbeddings(api_key=api_key)
    return await FAISS.afrom_documents(docs, embeddings)


async def rag_extract(query: str, store: FAISS, api_key: str) -> dict:
    """Retrieve top-K relevant chunks and extract a focused Requirement Map."""
    relevant = await store.asimilarity_search(query, k=RAG_TOP_K)
    combined = "\n\n".join(d.page_content for d in relevant)
    return await extract_requirement_map(combined, api_key)


# ── Stage 2: Generation (streaming) ──────────────────────────────────────────

async def generate_test_cases_stream(
    requirement_map: dict,
    api_key: str,
) -> AsyncIterator[str]:
    """
    Yields SSE-compatible text chunks.
    Grounding: the system prompt forbids inventing features not in the map.
    """
    llm = _make_llm(api_key, streaming=True)
    prompt = f"Requirement Map:\n{json.dumps(requirement_map, indent=2)}"

    async for chunk in llm.astream([
        {"role": "system", "content": _GENERATION_SYSTEM},
        {"role": "user", "content": prompt},
    ]):
        if chunk.content:
            yield chunk.content


# ── Full pipeline (non-streaming, returns parsed list) ────────────────────────

async def run_full_pipeline(text: str, api_key: str) -> tuple[dict, list[dict]]:
    """Returns (requirement_map, test_cases)."""
    req_map = await extract_requirement_map(text, api_key)

    llm = _make_llm(api_key)
    response = await llm.ainvoke([
        {"role": "system", "content": _GENERATION_SYSTEM},
        {"role": "user", "content": f"Requirement Map:\n{json.dumps(req_map, indent=2)}"},
    ])
    test_cases = json.loads(response.content)
    return req_map, test_cases
