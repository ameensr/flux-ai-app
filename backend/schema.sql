-- Feedback Loop Schema
-- Stores AI-generated test cases and user corrections for continuous improvement.

-- Generation sessions: one row per document/text submitted
CREATE TABLE IF NOT EXISTS generation_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,                          -- Supabase auth.users.id
    source_type TEXT NOT NULL CHECK (source_type IN ('file', 'text')),
    source_name TEXT,                                   -- original filename if file
    req_map     JSONB NOT NULL DEFAULT '{}',            -- the extracted Requirement Map
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated test cases: one row per test case produced in a session
CREATE TABLE IF NOT EXISTS generated_test_cases (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES generation_sessions(id) ON DELETE CASCADE,
    tc_ref      TEXT NOT NULL,                          -- e.g. "TC-001"
    content     JSONB NOT NULL,                         -- full test case JSON
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User corrections: delta between AI output and what the QA actually wanted
CREATE TABLE IF NOT EXISTS qa_corrections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    session_id      UUID NOT NULL REFERENCES generation_sessions(id) ON DELETE CASCADE,
    test_case_id    TEXT NOT NULL,                      -- tc_ref like "TC-001"
    original_json   JSONB NOT NULL,                     -- what the AI generated
    corrected_json  JSONB NOT NULL,                     -- what the user saved
    delta_json      JSONB NOT NULL,                     -- only the changed fields
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_qa_corrections_session ON qa_corrections(session_id);
CREATE INDEX IF NOT EXISTS idx_qa_corrections_user    ON qa_corrections(user_id);

-- Aggregated correction patterns view — used to identify systematic AI mistakes
-- e.g. "the AI always gets priority wrong for constraint-heavy requirements"
CREATE OR REPLACE VIEW correction_patterns AS
SELECT
    delta_json - 'created_at' AS changed_fields,
    COUNT(*)                  AS frequency,
    MAX(created_at)           AS last_seen
FROM qa_corrections
GROUP BY delta_json - 'created_at'
ORDER BY frequency DESC;

-- Tone refinement log (optional — for analytics)
CREATE TABLE IF NOT EXISTS tone_refinements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    tone        TEXT NOT NULL,
    input_len   INT,
    output_len  INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
