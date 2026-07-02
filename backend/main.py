"""
Flux AI — FastAPI Backend
Handles: document parsing, test case generation (streaming), tone refinement,
         Gherkin conversion, and feedback logging.

Auth: Supabase JWT validated on every request via verify_token().
"""
import io
import json
import os
from typing import Annotated, AsyncIterator

import asyncpg
import httpx
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from pydantic import BaseModel
from pydantic_settings import BaseSettings

from services.parser import (
    extract_requirement_map,
    generate_test_cases_stream,
    run_full_pipeline,
)
from services.pii import mask_pii
from services.feedback import log_correction, get_corrections_for_session

# ── Settings ──────────────────────────────────────────────────────────────────

class Settings(BaseSettings):
    openai_api_key: str
    supabase_jwt_secret: str          # Settings > API > JWT Secret in Supabase dashboard
    database_url: str                 # postgres://user:pass@host/db
    allowed_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Flux AI Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB pool ───────────────────────────────────────────────────────────────────

_pool: asyncpg.Pool | None = None

@app.on_event("startup")
async def startup():
    global _pool
    _pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)

@app.on_event("shutdown")
async def shutdown():
    if _pool:
        await _pool.close()

def get_pool() -> asyncpg.Pool:
    if not _pool:
        raise HTTPException(status_code=503, detail="DB not ready")
    return _pool

# ── Auth ──────────────────────────────────────────────────────────────────────

async def verify_token(authorization: str = "") -> dict:
    """Validate Supabase-issued JWT. Raises 401 on failure."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


from fastapi import Header

async def get_current_user(authorization: str = Header(default="")) -> dict:
    return await verify_token(authorization)

User = Annotated[dict, Depends(get_current_user)]

# ── Document text extraction ──────────────────────────────────────────────────

async def _extract_text(file: UploadFile) -> str:
    data = await file.read()
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()

    if ext == "pdf":
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        return "\n".join(p.extract_text() or "" for p in reader.pages)

    if ext == "docx":
        from docx import Document as DocxDocument
        doc = DocxDocument(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs)

    return data.decode("utf-8", errors="replace")

# ── SSE helper ────────────────────────────────────────────────────────────────

async def _sse(generator: AsyncIterator[str]) -> AsyncIterator[str]:
    async for chunk in generator:
        yield f"data: {json.dumps({'text': chunk})}\n\n"
    yield "data: [DONE]\n\n"

# ── Routes ────────────────────────────────────────────────────────────────────

# 1. Parse document → Requirement Map (Stage 1 only, useful for preview)
@app.post("/parse/map")
async def parse_map(
    user: User,
    file: UploadFile = File(...),
):
    text = await _extract_text(file)
    req_map = await extract_requirement_map(text, settings.openai_api_key)
    return {"requirement_map": req_map}


# 2. Full pipeline: document → Map → streaming test cases
@app.post("/parse/generate-stream")
async def parse_and_generate_stream(
    user: User,
    file: UploadFile = File(...),
):
    text = await _extract_text(file)
    req_map = await extract_requirement_map(text, settings.openai_api_key)

    async def _gen():
        async for chunk in _sse(generate_test_cases_stream(req_map, settings.openai_api_key)):
            yield chunk

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={"X-Requirement-Map": json.dumps(req_map)},
    )


# 3. Generate from plain text (no file upload) — streaming
class GenerateRequest(BaseModel):
    text: str

@app.post("/parse/generate-text-stream")
async def generate_from_text_stream(body: GenerateRequest, user: User):
    req_map = await extract_requirement_map(body.text, settings.openai_api_key)
    return StreamingResponse(
        _sse(generate_test_cases_stream(req_map, settings.openai_api_key)),
        media_type="text/event-stream",
    )


# 4. ToneRefiner — streaming
_TONE_PROMPTS = {
    "professional": "Rewrite in a formal, professional tone suitable for stakeholder communication.",
    "casual":       "Rewrite in a friendly, conversational tone. Keep it clear and approachable.",
    "technical":    "Rewrite with precise technical language. Use exact terminology, avoid ambiguity.",
}

class ToneRequest(BaseModel):
    text: str
    tone: str  # professional | casual | technical

@app.post("/tone/refine")
async def tone_refine(body: ToneRequest, user: User):
    instruction = _TONE_PROMPTS.get(body.tone)
    if not instruction:
        raise HTTPException(400, f"tone must be one of: {list(_TONE_PROMPTS)}")

    masked, _ = mask_pii(body.text)

    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, streaming=True)

    async def _gen() -> AsyncIterator[str]:
        async for chunk in llm.astream([
            {"role": "system", "content": f"{instruction} Return only the rewritten text."},
            {"role": "user", "content": masked},
        ]):
            if chunk.content:
                yield chunk.content

    return StreamingResponse(_sse(_gen()), media_type="text/event-stream")


# 5. JiraScribe — convert rough steps to Gherkin (Given/When/Then), streaming
_GHERKIN_SYSTEM = """You are a BDD expert. Convert the provided rough steps into
Gherkin format (Feature / Scenario / Given / When / Then / And).
Return ONLY the Gherkin text, no explanation, no markdown fences."""

class GherkinRequest(BaseModel):
    steps: str   # raw, unstructured steps text

@app.post("/jira/gherkin")
async def jira_gherkin(body: GherkinRequest, user: User):
    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, streaming=True)

    async def _gen() -> AsyncIterator[str]:
        async for chunk in llm.astream([
            {"role": "system", "content": _GHERKIN_SYSTEM},
            {"role": "user", "content": body.steps},
        ]):
            if chunk.content:
                yield chunk.content

    return StreamingResponse(_sse(_gen()), media_type="text/event-stream")


# 6. PII check (utility endpoint — returns masked text + findings)
class PIIRequest(BaseModel):
    text: str

@app.post("/utils/mask-pii")
async def mask_pii_endpoint(body: PIIRequest, user: User):
    masked, findings = mask_pii(body.text)
    return {"masked_text": masked, "findings": findings}


# 7. Feedback — log a user correction
class CorrectionRequest(BaseModel):
    session_id: str
    test_case_id: str
    original: dict
    corrected: dict

@app.post("/feedback/correction")
async def submit_correction(
    body: CorrectionRequest,
    user: User,
    pool: asyncpg.Pool = Depends(get_pool),
):
    await log_correction(
        pool=pool,
        user_id=user["sub"],
        session_id=body.session_id,
        test_case_id=body.test_case_id,
        original=body.original,
        corrected=body.corrected,
    )
    return {"status": "logged"}


# 8. Feedback — retrieve corrections for a session
@app.get("/feedback/corrections/{session_id}")
async def get_corrections(
    session_id: str,
    user: User,
    pool: asyncpg.Pool = Depends(get_pool),
):
    rows = await get_corrections_for_session(pool, session_id)
    return {"corrections": rows}
