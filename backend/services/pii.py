"""
Lightweight PII masking (regex) — no spaCy/Presidio/numpy required.
Scrubs common sensitive patterns before text reaches the LLM.
"""
import re

_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("EMAIL_ADDRESS", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("PHONE_NUMBER", re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b")),
    ("CREDIT_CARD", re.compile(r"\b(?:\d[ -]*?){13,19}\b")),
    ("US_SSN", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("IP_ADDRESS", re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")),
    ("URL", re.compile(r"https?://[^\s<>\"']+", re.IGNORECASE)),
]

_PLACEHOLDERS = {
    "EMAIL_ADDRESS": "<EMAIL>",
    "PHONE_NUMBER": "<PHONE>",
    "CREDIT_CARD": "<CREDIT_CARD>",
    "US_SSN": "<SSN>",
    "IP_ADDRESS": "<IP>",
    "URL": "<URL>",
}


def mask_pii(text: str, language: str = "en") -> tuple[str, list[dict]]:
    """
    Returns (masked_text, findings).
    findings is a list of {entity_type, start, end, score} for audit logging.
    """
    del language  # regex path is language-agnostic
    findings: list[dict] = []
    masked = text

    # Apply replacements from end-to-start per pattern to keep offsets stable within a pass
    for entity_type, pattern in _PATTERNS:
        matches = list(pattern.finditer(masked))
        for m in reversed(matches):
            findings.append({
                "entity_type": entity_type,
                "start": m.start(),
                "end": m.end(),
                "score": 0.85,
            })
            placeholder = _PLACEHOLDERS[entity_type]
            masked = masked[: m.start()] + placeholder + masked[m.end() :]

    findings.sort(key=lambda f: f["start"])
    return masked, findings
