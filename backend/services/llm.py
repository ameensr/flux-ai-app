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
import asyncio
import re

from openai import AsyncOpenAI

DEFAULT_TIMEOUT_S = 180.0
# Large JSON suites (test cases) need a longer per-provider timeout
MAX_TIMEOUT_S = 600.0
# Escalate to Gemini sooner for long / structured work
COMPLEX_PROMPT_CHARS = 3_500
COMPLEX_MAX_TOKENS = 2_500


def timeout_for_tokens(max_tokens: int) -> float:
    """Scale HTTP timeout with output budget so Groq isn't abandoned mid-stream."""
    # ~25 tok/s worst-case floor + overhead; cap at MAX_TIMEOUT_S
    return min(MAX_TIMEOUT_S, max(DEFAULT_TIMEOUT_S, 45.0 + max_tokens * 0.05))


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
    prefer: tuple[str, ...] | None = None,
) -> list[ProviderConfig]:
    """
    Default: Groq → Gemini → Kimi (configured order).
    `prefer` overrides the name order when set (e.g. gemini-first for large suites).
    """
    by_name = {p.name: p for p in providers if p.api_key and p.model}
    names = prefer if prefer else ("groq", "gemini", "kimi")
    ordered: list[ProviderConfig] = []
    for name in names:
        if name in by_name:
            ordered.append(by_name[name])
    # Any remaining configured providers last
    for p in providers:
        if p.name not in {x.name for x in ordered} and p.api_key and p.model:
            ordered.append(p)

    if is_complex_prompt(prompt, max_tokens) and any(p.name == "gemini" for p in ordered):
        print("INFO: complex prompt detected — Gemini will be used if preferred provider fails")

    return ordered


async def _stream_one(
    provider: ProviderConfig,
    *,
    prompt: str,
    system_prompt: str | None,
    temperature: float,
    max_tokens: int,
    timeout: float | None = None,
    json_mode: bool = False,
) -> AsyncIterator[str]:
    client = make_client(
        provider.api_key,
        provider.base_url,
        timeout=timeout if timeout is not None else timeout_for_tokens(max_tokens),
    )
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

    if json_mode and provider.name == "gemini":
        kwargs["response_format"] = {"type": "json_object"}

    stream = await client.chat.completions.create(**kwargs)
    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content


async def chat_stream_events(
    *,
    prompt: str,
    providers: list[ProviderConfig] | None = None,
    system_prompt: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    timeout: float | None = None,
    prefer: tuple[str, ...] | None = None,
    json_mode: bool = False,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
    reasoning_effort: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """
    Stream LLM output as events:
      {"type": "provider", "name": "groq", "model": "..."}  — once, before content
      {"type": "content", "text": "..."}                    — content chunks
    """
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

    ordered = order_providers(chain, prompt=prompt, max_tokens=max_tokens, prefer=prefer)
    if not ordered:
        raise RuntimeError(
            "No AI providers configured. Set GROQ_API_KEY, GEMINI_API_KEY, "
            "and/or TOKENROUTER_API_KEY."
        )

    request_timeout = timeout if timeout is not None else timeout_for_tokens(max_tokens)
    errors: list[str] = []
    for provider in ordered:
        attempts = 2 if provider.name == "gemini" else 1
        for attempt in range(1, attempts + 1):
            yielded = False
            try:
                print(
                    f"INFO: LLM via {provider.name} ({provider.model}) "
                    f"max_tokens={max_tokens} timeout={request_timeout:.0f}s"
                    + (f" attempt={attempt}" if attempts > 1 else "")
                )
                async for piece in _stream_one(
                    provider,
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=request_timeout,
                    json_mode=json_mode,
                ):
                    if not yielded:
                        yield {
                            "type": "provider",
                            "name": provider.name,
                            "model": provider.model,
                        }
                        yielded = True
                    yield {"type": "content", "text": piece}
                if yielded:
                    return
                errors.append(f"{provider.name}: empty response")
                print(f"WARNING: {provider.name} returned empty — trying next provider")
                break
            except Exception as e:
                if yielded:
                    raise
                msg = f"{provider.name}: {e}"
                err_text = str(e)
                # One retry on Gemini free-tier rate limit
                if (
                    attempt < attempts
                    and ("429" in err_text or "RESOURCE_EXHAUSTED" in err_text or "quota" in err_text.lower())
                ):
                    delay = 8.0
                    m = re.search(r"retry in ([0-9.]+)s", err_text, re.I)
                    if m:
                        delay = min(45.0, float(m.group(1)) + 1.0)
                    print(f"WARNING: {msg} — retrying in {delay:.1f}s")
                    await asyncio.sleep(delay)
                    continue
                errors.append(msg)
                print(f"WARNING: {msg} — trying next provider")
                break

    raise RuntimeError("All AI providers failed: " + "; ".join(errors))


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
    async for event in chat_stream_events(
        prompt=prompt,
        providers=providers,
        system_prompt=system_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=api_key,
        base_url=base_url,
        model=model,
        reasoning_effort=reasoning_effort,
    ):
        if event.get("type") == "content" and event.get("text"):
            yield event["text"]


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
    content, _, _ = await chat_complete_with_provider(
        providers=providers,
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=api_key,
        base_url=base_url,
        model=model,
        reasoning_effort=reasoning_effort,
    )
    return content


async def chat_complete_with_provider(
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
) -> tuple[str, str, str]:
    """Like chat_complete, but also returns (content, provider_name, model)."""
    parts: list[str] = []
    provider_name = ""
    provider_model = ""
    async for event in chat_stream_events(
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
        if event.get("type") == "provider":
            provider_name = str(event.get("name") or "")
            provider_model = str(event.get("model") or "")
        elif event.get("type") == "content" and event.get("text"):
            parts.append(event["text"])
    content = "".join(parts).strip()
    if not content:
        raise ValueError(
            "AI returned empty response (model may have used all tokens on reasoning). "
            "Please try again."
        )
    return content, provider_name, provider_model
