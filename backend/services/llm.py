"""
Multi-provider LLM client (OpenAI-compatible).

Fallback chain:
  1. Groq   — default free / fastest
  2. Gemini — hard/complex prompts or when Groq fails
  3. Kimi   — via TokenRouter, last resort

Providers without an API key are skipped.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, AsyncIterator

from openai import AsyncOpenAI

DEFAULT_TIMEOUT_S = 180.0
# Escalate to Gemini sooner for long / structured work
COMPLEX_PROMPT_CHARS = 3_500
COMPLEX_MAX_TOKENS = 2_500


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    api_key: str
    base_url: str
    model: str
    reasoning_effort: str | None = None


def make_client(api_key: str, base_url: str, timeout: float = DEFAULT_TIMEOUT_S) -> AsyncOpenAI:
    return AsyncOpenAI(base_url=base_url, api_key=api_key, timeout=timeout)


def is_complex_prompt(prompt: str, max_tokens: int = 2048) -> bool:
    """Heuristic: long inputs or large generations → prefer Gemini after Groq fails."""
    if max_tokens >= COMPLEX_MAX_TOKENS:
        return True
    if len(prompt) >= COMPLEX_PROMPT_CHARS:
        return True
    lower = prompt.lower()
    complex_markers = (
        "requirement map",
        "test cases",
        "edge case",
        "regression",
        "gherkin",
        "structured json",
        "clarificationquestions",
    )
    return any(m in lower for m in complex_markers)


def order_providers(
    providers: list[ProviderConfig],
    *,
    prompt: str,
    max_tokens: int,
) -> list[ProviderConfig]:
    """
    Always: Groq → Gemini → Kimi (configured order).
    Complex prompts keep the same chain but log intent for Gemini fallback.
    """
    by_name = {p.name: p for p in providers if p.api_key and p.model}
    ordered: list[ProviderConfig] = []
    for name in ("groq", "gemini", "kimi"):
        if name in by_name:
            ordered.append(by_name[name])
    # Any unexpected custom providers last
    for p in providers:
        if p.name not in ("groq", "gemini", "kimi") and p.api_key and p.model:
            ordered.append(p)

    if is_complex_prompt(prompt, max_tokens) and any(p.name == "gemini" for p in ordered):
        print("INFO: complex prompt detected — Gemini will be used if Groq fails")

    return ordered


async def _stream_one(
    provider: ProviderConfig,
    *,
    prompt: str,
    system_prompt: str | None,
    temperature: float,
    max_tokens: int,
) -> AsyncIterator[str]:
    client = make_client(provider.api_key, provider.base_url)
    messages: list[dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    kwargs: dict[str, Any] = {
        "model": provider.model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }
    # stream_options is OpenAI/Groq-friendly; Gemini may ignore unknown fields
    if provider.name != "gemini":
        kwargs["stream_options"] = {"include_usage": True}

    # Kimi K3 only — reasoning_effort via extra_body
    if provider.reasoning_effort:
        kwargs["extra_body"] = {"reasoning_effort": provider.reasoning_effort}

    stream = await client.chat.completions.create(**kwargs)
    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content


async def chat_stream(
    *,
    prompt: str,
    providers: list[ProviderConfig] | None = None,
    system_prompt: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    # Legacy single-provider kwargs — used only when providers is empty
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
    reasoning_effort: str | None = None,
) -> AsyncIterator[str]:
    chain = list(providers or [])
    if not chain and api_key and base_url and model:
        chain = [
            ProviderConfig(
                name="legacy",
                api_key=api_key,
                base_url=base_url,
                model=model,
                reasoning_effort=reasoning_effort,
            )
        ]

    ordered = order_providers(chain, prompt=prompt, max_tokens=max_tokens)
    if not ordered:
        raise RuntimeError(
            "No AI providers configured. Set GROQ_API_KEY, GEMINI_API_KEY, "
            "and/or TOKENROUTER_API_KEY."
        )

    errors: list[str] = []
    for provider in ordered:
        yielded = False
        try:
            print(f"INFO: LLM via {provider.name} ({provider.model})")
            async for piece in _stream_one(
                provider,
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            ):
                yielded = True
                yield piece
            if yielded:
                return
            errors.append(f"{provider.name}: empty response")
            print(f"WARNING: {provider.name} returned empty — trying next provider")
        except Exception as e:
            if yielded:
                raise
            msg = f"{provider.name}: {e}"
            errors.append(msg)
            print(f"WARNING: {msg} — trying next provider")

    raise RuntimeError("All AI providers failed: " + "; ".join(errors))


async def chat_complete(
    *,
    prompt: str,
    providers: list[ProviderConfig] | None = None,
    system_prompt: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
    reasoning_effort: str | None = None,
) -> str:
    """Aggregate a streamed completion with provider fallback."""
    parts: list[str] = []
    async for piece in chat_stream(
        providers=providers,
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=api_key,
        base_url=base_url,
        model=model,
        reasoning_effort=reasoning_effort,
    ):
        parts.append(piece)
    content = "".join(parts).strip()
    if not content:
        raise ValueError(
            "AI returned empty response (model may have used all tokens on reasoning). "
            "Please try again."
        )
    return content
