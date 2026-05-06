-- AI Provider Configs table
-- API keys are stored AES-256-GCM encrypted; raw keys never leave the server

create table if not exists public.ai_provider_configs (
  id               uuid primary key default gen_random_uuid(),
  provider_name    text not null,                        -- 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'deepseek' | 'ollama'
  encrypted_api_key text not null,                       -- AES-GCM encrypted, base64 encoded
  model_name       text not null,
  is_active        boolean not null default false,       -- only ONE row should be active at a time
  is_enabled       boolean not null default true,
  max_tokens       integer not null default 4096,
  temperature      numeric(3,2) not null default 0.7,
  -- future-ready
  rate_limit_rpm   integer,                              -- requests per minute
  monthly_budget   numeric(10,2),                        -- USD
  fallback_provider_id uuid references public.ai_provider_configs(id),
  provider_priority integer not null default 0,
  -- audit
  created_by       uuid not null references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Only one active provider at a time (partial unique index)
create unique index if not exists ai_provider_configs_single_active
  on public.ai_provider_configs (is_active)
  where is_active = true;

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger ai_provider_configs_updated_at
  before update on public.ai_provider_configs
  for each row execute function public.set_updated_at();

-- RLS: only admins can read/write; service_role bypasses for edge functions
alter table public.ai_provider_configs enable row level security;

create policy "admins_all" on public.ai_provider_configs
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Usage log table (future-ready)
create table if not exists public.ai_usage_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id),
  provider_id  uuid references public.ai_provider_configs(id),
  module       text,
  prompt_tokens  integer,
  completion_tokens integer,
  total_tokens integer,
  latency_ms   integer,
  created_at   timestamptz not null default now()
);

alter table public.ai_usage_logs enable row level security;

create policy "admins_read_logs" on public.ai_usage_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Users can only see their own logs
create policy "users_own_logs" on public.ai_usage_logs
  for select using (user_id = auth.uid());
