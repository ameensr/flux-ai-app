-- Per-user AI allowlist for Centralised AI provider.
-- Empty array = only admin / super_admin may use AI.
-- Non-empty = those user IDs (+ admin / super_admin) may use AI (still subject to RBAC).

ALTER TABLE public.ai_platform_config
  ADD COLUMN IF NOT EXISTS allowed_user_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.ai_platform_config.allowed_user_ids IS
  'User IDs allowed to use AI while Centralised AI is enabled. Empty = admins only. Admin/super_admin always bypass.';
