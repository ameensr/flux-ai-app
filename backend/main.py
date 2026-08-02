"""
Flux AI — FastAPI Backend
AI via Groq → Gemini → Kimi (TokenRouter) fallback chain. Endpoints:
  POST /ai/bug-refine
  POST /ai/test-cases  (SSE stream)
  POST /ai/writing
  POST /ai/complete    (generic: copilot, QA report, etc.)

Also: document parsing, Gherkin, PII, feedback.
Auth: Supabase JWT validated on every request via verify_token().
"""
import io
import json
import time
from typing import Annotated, AsyncIterator, Literal

import asyncpg
import httpx
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from pydantic_settings import BaseSettings

from services.feedback import get_corrections_for_session, log_correction
from services.llm import ProviderConfig, chat_complete, chat_stream
from services.parser import extract_requirement_map, generate_test_cases_stream
from services.pii import mask_pii

# ── Settings ──────────────────────────────────────────────────────────────────

class Settings(BaseSettings):
    # Groq — default free / fastest
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "llama-3.3-70b-versatile"
    groq_model_fast: str = "llama-3.1-8b-instant"

    # Gemini — fallback for hard/complex or when Groq fails
    gemini_api_key: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    gemini_model: str = "gemini-2.5-flash"

    # Kimi via TokenRouter — last resort
    tokenrouter_api_key: str = ""
    tokenrouter_base_url: str = "https://api.tokenrouter.com/v1"
    tokenrouter_model: str = "moonshotai/kimi-k3-free"
    # Kimi K3: low|high|max — default low for speed (API default is max = very slow)
    tokenrouter_reasoning_effort: str = "low"

    supabase_url: str
    supabase_anon_key: str
    database_url: str = ""
    allowed_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()

if not any((settings.groq_api_key, settings.gemini_api_key, settings.tokenrouter_api_key)):
    print(
        "WARNING: No AI provider keys set. "
        "Configure GROQ_API_KEY, GEMINI_API_KEY, and/or TOKENROUTER_API_KEY."
    )

# ── Default system prompts ────────────────────────────────────────────────────

BUG_SYSTEM = (
    "You are a professional QA engineer. Convert the user's rough bug notes into a "
    "structured bug report. Use exactly these section headings on their own lines, in this order, "
    "each as **Heading**: **Title**, **Severity**, **Environment**, **Steps to Reproduce**, "
    "**Expected Result**, **Actual Result**, **Possible Cause**. "
    "Severity must be one of Critical/High/Medium/Low. Be very concise. "
    "Output only the report immediately, no preamble."
)

TEST_CASE_SYSTEM = (
    'You are a senior QA test architect. Return ONLY valid JSON (no markdown) with shape: '
    '{"testCases":[{"title":"Verify that...","priority":"High|Medium|Low",'
    '"status":"Draft|Ready|Automated","steps":["..."]}],'
    '"notes":{"gaps":[],"clarificationQuestions":[],"assumptions":[],"risks":[]}}. '
    'Return 5-8 concise test cases. Keep steps short (3-6 each). Notes: max 3 items per list.'
)

WRITING_SYSTEM = (
    "You are a writing assistant. Rewrite or refine the user's text as instructed. "
    "Return only the rewritten text, no preamble."
)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Flux AI Backend", version="2.0.0")
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
    if not settings.database_url:
        print("WARNING: DATABASE_URL not set — feedback endpoints disabled.")
        return
    try:
        _pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)
    except Exception as e:
        print(f"WARNING: Could not connect to PostgreSQL database: {e}")
        print("Backend will run with database-dependent endpoints disabled.")

@app.on_event("shutdown")
async def shutdown():
    if _pool:
        await _pool.close()

def get_pool() -> asyncpg.Pool:
    if not _pool:
        raise HTTPException(
            status_code=503,
            detail="Database pool is not initialized because the connection failed.",
        )
    return _pool

# ── Auth ──────────────────────────────────────────────────────────────────────

async def verify_token(authorization: str = "") -> dict:
    """Validate the access token via Supabase Auth (works with HS256 + new signing keys)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_anon_key,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=headers)
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable",
        )

    if res.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    data = res.json()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    return {
        "sub": user_id,
        "email": data.get("email"),
        "role": data.get("role") or "authenticated",
        "user": data,
    }


async def get_current_user(authorization: str = Header(default="")) -> dict:
    return await verify_token(authorization)

User = Annotated[dict, Depends(get_current_user)]

# ── Centralised AI kill-switch + user allowlist ────────────────────────────────

_AI_CONFIG_ID = "00000000-0000-0000-0000-000000000001"
_AI_CACHE_TTL_S = 5.0
# Cache: (monotonic_ts, enabled, allowed_user_ids)
_ai_config_cache: tuple[float, bool, list[str]] | None = None


def _normalize_user_ids(raw_ids) -> list[str]:
    if not isinstance(raw_ids, list):
        return []
    return [str(x).strip().lower() for x in raw_ids if x is not None and str(x).strip()]


async def _read_ai_platform_config() -> tuple[bool, list[str]] | None:
    """Return (enabled, allowed_user_ids), or None if it could not be read."""
    global _pool
    if _pool is not None:
        try:
            async with _pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT enabled, allowed_user_ids FROM ai_platform_config WHERE id = $1::uuid",
                    _AI_CONFIG_ID,
                )
                if row is not None:
                    return bool(row["enabled"]), _normalize_user_ids(row["allowed_user_ids"] or [])
        except Exception as e:
            print(f"WARNING: ai_platform_config pool read failed: {e}")

    # Fallback: Supabase PostgREST (works when DATABASE_URL is local/unavailable)
    try:
        url = f"{settings.supabase_url.rstrip('/')}/rest/v1/ai_platform_config"
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(
                url,
                params={
                    "select": "enabled,allowed_user_ids",
                    "id": f"eq.{_AI_CONFIG_ID}",
                    "limit": "1",
                },
                headers={
                    "apikey": settings.supabase_anon_key,
                    "Authorization": f"Bearer {settings.supabase_anon_key}",
                },
            )
        if res.status_code == 200:
            data = res.json()
            if isinstance(data, list) and data:
                row = data[0]
                return bool(row.get("enabled", True)), _normalize_user_ids(row.get("allowed_user_ids") or [])
        else:
            print(f"WARNING: ai_platform_config REST status {res.status_code}: {res.text[:300]}")
    except Exception as e:
        print(f"WARNING: ai_platform_config REST read failed: {e}")

    return None


async def _is_platform_admin(user_id: str, authorization: str = "") -> bool:
    """True when profiles.role is admin or super_admin (always bypass allowlist)."""
    global _pool
    if _pool is not None:
        try:
            async with _pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT role FROM profiles WHERE id = $1::uuid",
                    user_id,
                )
                if row is not None:
                    return str(row["role"] or "") in ("admin", "super_admin")
        except Exception as e:
            print(f"WARNING: profiles role pool read failed: {e}")

    # Fallback: PostgREST with the caller's JWT (own profile is readable)
    try:
        url = f"{settings.supabase_url.rstrip('/')}/rest/v1/profiles"
        headers = {
            "apikey": settings.supabase_anon_key,
            "Authorization": authorization if authorization.startswith("Bearer ")
            else f"Bearer {settings.supabase_anon_key}",
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(
                url,
                params={
                    "select": "role",
                    "id": f"eq.{user_id}",
                    "limit": "1",
                },
                headers=headers,
            )
        if res.status_code == 200:
            data = res.json()
            if isinstance(data, list) and data:
                return str(data[0].get("role") or "") in ("admin", "super_admin")
    except Exception as e:
        print(f"WARNING: profiles role REST read failed: {e}")

    return False


async def require_ai_enabled(
    user: dict = Depends(get_current_user),
    authorization: str = Header(default=""),
) -> None:
    """Block LLM routes when Centralised AI is off or the user is not allowlisted."""
    global _ai_config_cache
    now = time.monotonic()
    if _ai_config_cache and (now - _ai_config_cache[0]) < _AI_CACHE_TTL_S:
        enabled, allowed_ids = _ai_config_cache[1], _ai_config_cache[2]
    else:
        read = await _read_ai_platform_config()
        if read is None:
            # Fail closed — never allow AI when allowlist/status cannot be verified.
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to verify Centralised AI status.",
            )
        enabled, allowed_ids = read
        _ai_config_cache = (now, enabled, allowed_ids)

    if not enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Centralised AI is disabled by an administrator.",
        )

    user_id = str(user.get("sub") or "").strip().lower()
    if user_id and await _is_platform_admin(user_id, authorization):
        return

    # Allowlist: only checked users may use AI. Empty list = nobody except admins.
    if user_id and user_id in allowed_ids:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are restricted to use AI. Contact Administration.",
    )


AIEnabled = Annotated[None, Depends(require_ai_enabled)]

# ── Shared AI helpers ─────────────────────────────────────────────────────────

class AIRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    prompt: str
    system_prompt: str | None = Field(default=None, alias="systemPrompt")


TaskHint = Literal["default", "fast", "heavy"]


def _llm_kwargs(task: TaskHint = "default") -> dict:
    """
    Build provider chain: Groq → Gemini → Kimi.
    task=fast  → Groq 8B instant (writing / short rewrites)
    task=heavy → Groq 70B (test cases, bug reports, parsing)
    """
    effort = (settings.tokenrouter_reasoning_effort or "low").strip().lower()
    if effort not in ("low", "high", "max"):
        effort = "low"

    groq_model = settings.groq_model_fast if task == "fast" else settings.groq_model
    providers: list[ProviderConfig] = []

    if settings.groq_api_key:
        providers.append(
            ProviderConfig(
                name="groq",
                api_key=settings.groq_api_key,
                base_url=settings.groq_base_url,
                model=groq_model,
            )
        )
    if settings.gemini_api_key:
        providers.append(
            ProviderConfig(
                name="gemini",
                api_key=settings.gemini_api_key,
                base_url=settings.gemini_base_url,
                model=settings.gemini_model,
            )
        )
    if settings.tokenrouter_api_key:
        providers.append(
            ProviderConfig(
                name="kimi",
                api_key=settings.tokenrouter_api_key,
                base_url=settings.tokenrouter_base_url,
                model=settings.tokenrouter_model,
                reasoning_effort=effort,
            )
        )

    return {"providers": providers}


async def _sse(generator: AsyncIterator[str]) -> AsyncIterator[str]:
    """OpenAI-compatible SSE for the frontend stream parser."""
    async for chunk in generator:
        payload = {"choices": [{"delta": {"content": chunk}}]}
        yield f"data: {json.dumps(payload)}\n\n"
    yield "data: [DONE]\n\n"


# ── AI routes (Groq → Gemini → Kimi) ──────────────────────────────────────────

@app.post("/ai/bug-refine")
async def ai_bug_refine(body: AIRequest, user: User, _ai: AIEnabled):
    """SSE stream with Groq → Gemini → Kimi fallback."""
    if not body.prompt.strip():
        raise HTTPException(400, "prompt is required")

    async def _gen() -> AsyncIterator[str]:
        try:
            async for chunk in chat_stream(
                **_llm_kwargs("heavy"),
                prompt=body.prompt.strip(),
                system_prompt=body.system_prompt or BUG_SYSTEM,
                temperature=0.4,
                max_tokens=1536,
            ):
                yield chunk
        except Exception as e:
            # Surface provider errors into the SSE so the client can show them
            yield f"\n\n[Error: {e}]"

    return StreamingResponse(_sse(_gen()), media_type="text/event-stream")


@app.post("/ai/test-cases")
async def ai_test_cases(body: AIRequest, user: User, _ai: AIEnabled):
    if not body.prompt.strip():
        raise HTTPException(400, "prompt is required")

    async def _gen() -> AsyncIterator[str]:
        try:
            async for chunk in chat_stream(
                **_llm_kwargs("heavy"),
                prompt=body.prompt.strip(),
                system_prompt=body.system_prompt or TEST_CASE_SYSTEM,
                temperature=0.3,
                max_tokens=3072,
            ):
                yield chunk
        except Exception as e:
            yield f"\n\n[Error: {e}]"

    return StreamingResponse(_sse(_gen()), media_type="text/event-stream")


@app.post("/ai/writing")
async def ai_writing(body: AIRequest, user: User, _ai: AIEnabled):
    if not body.prompt.strip():
        raise HTTPException(400, "prompt is required")
    content = await chat_complete(
        **_llm_kwargs("fast"),
        prompt=body.prompt.strip(),
        system_prompt=body.system_prompt or WRITING_SYSTEM,
        temperature=0.7,
        max_tokens=1024,
    )
    return {"content": content}


@app.post("/ai/complete")
async def ai_complete(body: AIRequest, user: User, _ai: AIEnabled):
    """Generic completion for Copilot, QA report summaries, etc."""
    if not body.prompt.strip():
        raise HTTPException(400, "prompt is required")
    content = await chat_complete(
        **_llm_kwargs("default"),
        prompt=body.prompt.strip(),
        system_prompt=body.system_prompt,
        temperature=0.7,
        max_tokens=2048,
    )
    return {"content": content}


@app.get("/health")
async def health():
    configured = []
    if settings.groq_api_key:
        configured.append({"provider": "groq", "model": settings.groq_model})
    if settings.gemini_api_key:
        configured.append({"provider": "gemini", "model": settings.gemini_model})
    if settings.tokenrouter_api_key:
        configured.append({"provider": "kimi", "model": settings.tokenrouter_model})
    return {
        "status": "ok",
        "chain": ["groq", "gemini", "kimi"],
        "providers": configured,
        "default": configured[0] if configured else None,
    }


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


# ── Legacy parse / tone / jira routes ─────────────────────────────────────────

@app.post("/parse/map")
async def parse_map(user: User, _ai: AIEnabled, file: UploadFile = File(...)):
    text = await _extract_text(file)
    req_map = await extract_requirement_map(text, **_llm_kwargs("heavy"))
    return {"requirement_map": req_map}


@app.post("/parse/generate-stream")
async def parse_and_generate_stream(user: User, _ai: AIEnabled, file: UploadFile = File(...)):
    text = await _extract_text(file)
    req_map = await extract_requirement_map(text, **_llm_kwargs("heavy"))

    async def _gen():
        async for chunk in _sse(generate_test_cases_stream(req_map, **_llm_kwargs("heavy"))):
            yield chunk

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={"X-Requirement-Map": json.dumps(req_map)},
    )


class GenerateRequest(BaseModel):
    text: str


@app.post("/parse/generate-text-stream")
async def generate_from_text_stream(body: GenerateRequest, user: User, _ai: AIEnabled):
    req_map = await extract_requirement_map(body.text, **_llm_kwargs("heavy"))
    return StreamingResponse(
        _sse(generate_test_cases_stream(req_map, **_llm_kwargs("heavy"))),
        media_type="text/event-stream",
    )


_TONE_PROMPTS = {
    "professional": "Rewrite in a formal, professional tone suitable for stakeholder communication.",
    "casual": "Rewrite in a friendly, conversational tone. Keep it clear and approachable.",
    "technical": "Rewrite with precise technical language. Use exact terminology, avoid ambiguity.",
}


class ToneRequest(BaseModel):
    text: str
    tone: str


@app.post("/tone/refine")
async def tone_refine(body: ToneRequest, user: User, _ai: AIEnabled):
    instruction = _TONE_PROMPTS.get(body.tone)
    if not instruction:
        raise HTTPException(400, f"tone must be one of: {list(_TONE_PROMPTS)}")

    masked, _ = mask_pii(body.text)

    async def _gen() -> AsyncIterator[str]:
        async for chunk in chat_stream(
            **_llm_kwargs("fast"),
            prompt=masked,
            system_prompt=f"{instruction} Return only the rewritten text.",
            temperature=0.7,
        ):
            yield chunk

    return StreamingResponse(_sse(_gen()), media_type="text/event-stream")


_GHERKIN_SYSTEM = """You are a BDD expert. Convert the provided rough steps into
Gherkin format (Feature / Scenario / Given / When / Then / And).
Return ONLY the Gherkin text, no explanation, no markdown fences."""


class GherkinRequest(BaseModel):
    steps: str


@app.post("/jira/gherkin")
async def jira_gherkin(body: GherkinRequest, user: User, _ai: AIEnabled):
    async def _gen() -> AsyncIterator[str]:
        async for chunk in chat_stream(
            **_llm_kwargs("heavy"),
            prompt=body.steps,
            system_prompt=_GHERKIN_SYSTEM,
            temperature=0.3,
        ):
            yield chunk

    return StreamingResponse(_sse(_gen()), media_type="text/event-stream")


class PIIRequest(BaseModel):
    text: str


@app.post("/utils/mask-pii")
async def mask_pii_endpoint(body: PIIRequest, user: User):
    masked, findings = mask_pii(body.text)
    return {"masked_text": masked, "findings": findings}


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


@app.get("/feedback/corrections/{session_id}")
async def get_corrections(
    session_id: str,
    user: User,
    pool: asyncpg.Pool = Depends(get_pool),
):
    rows = await get_corrections_for_session(pool, session_id)
    return {"corrections": rows}
