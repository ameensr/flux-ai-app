"""
Feedback Loop — logs the delta between AI-generated and user-corrected test cases.
The delta is stored as a JSON diff and can be used to fine-tune prompts over time.
"""
import json
import asyncpg
from datetime import datetime, timezone


def _compute_delta(original: dict, corrected: dict) -> dict:
    """Return only the fields that changed."""
    return {
        key: {"from": original.get(key), "to": corrected.get(key)}
        for key in set(original) | set(corrected)
        if original.get(key) != corrected.get(key)
    }


async def log_correction(
    pool: asyncpg.Pool,
    user_id: str,
    session_id: str,
    test_case_id: str,
    original: dict,
    corrected: dict,
) -> None:
    delta = _compute_delta(original, corrected)
    if not delta:
        return  # nothing changed

    await pool.execute(
        """
        INSERT INTO qa_corrections
            (user_id, session_id, test_case_id, original_json, corrected_json, delta_json, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """,
        user_id,
        session_id,
        test_case_id,
        json.dumps(original),
        json.dumps(corrected),
        json.dumps(delta),
        datetime.now(timezone.utc),
    )


async def get_corrections_for_session(
    pool: asyncpg.Pool, session_id: str
) -> list[dict]:
    rows = await pool.fetch(
        "SELECT * FROM qa_corrections WHERE session_id = $1 ORDER BY created_at",
        session_id,
    )
    return [dict(r) for r in rows]
