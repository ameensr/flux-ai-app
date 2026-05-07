-- AI Module Prompts — centralized admin-controlled system prompts
-- Users NEVER see these; they are injected server-side only.

create table if not exists public.ai_module_prompts (
  id            uuid primary key default gen_random_uuid(),
  module_key    text not null,           -- e.g. 'test-case-generator'
  module_name   text not null,           -- e.g. 'Test Case Generator'
  system_prompt text not null default '',
  is_active     boolean not null default true,
  version       integer not null default 1,
  -- future-ready overrides (null = use global provider defaults)
  temperature   numeric(3,2),
  max_tokens    integer,
  -- audit
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One active prompt per module
create unique index if not exists ai_module_prompts_active_module
  on public.ai_module_prompts (module_key)
  where is_active = true;

drop trigger if exists ai_module_prompts_updated_at on public.ai_module_prompts;
create trigger ai_module_prompts_updated_at
  before update on public.ai_module_prompts
  for each row execute function public.set_updated_at();

-- RLS: only admins via frontend; service_role bypasses for edge functions
alter table public.ai_module_prompts enable row level security;

drop policy if exists "admins_all_prompts" on public.ai_module_prompts;
create policy "admins_all_prompts" on public.ai_module_prompts
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Prompt version history (append-only audit log)
create table if not exists public.ai_prompt_versions (
  id            uuid primary key default gen_random_uuid(),
  prompt_id     uuid not null references public.ai_module_prompts(id) on delete cascade,
  module_key    text not null,
  system_prompt text not null,
  version       integer not null,
  changed_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);

alter table public.ai_prompt_versions enable row level security;

drop policy if exists "admins_read_versions" on public.ai_prompt_versions;
create policy "admins_read_versions" on public.ai_prompt_versions
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Seed default prompts for existing modules
insert into public.ai_module_prompts (module_key, module_name, system_prompt, created_by)
select
  v.module_key,
  v.module_name,
  v.system_prompt,
  (select id from auth.users order by created_at limit 1)
from (values
  (
    'test-case-generator',
    'Test Case Generator',
    'You are a senior QA engineer. Given a requirement, return ONLY a valid JSON array (no markdown, no explanation) of test case objects. Each object must have exactly these fields: "title" (string), "priority" ("High" | "Medium" | "Low"), "status" ("Draft" | "Ready" | "Automated").'
  ),
  (
    'bug-refiner',
    'Bug Refiner',
    'You are a professional QA engineer. Convert the user''s rough bug notes into a structured bug report with these sections: **Title**, **Severity** (Critical/High/Medium/Low), **Environment**, **Steps to Reproduce**, **Expected Result**, **Actual Result**, **Possible Cause**. Be concise and professional. Output only the report, no preamble.'
  ),
  (
    'writing-assistant',
    'Writing Assistant',
    'You are a professional technical writer specializing in QA documentation. Rewrite the provided text to be clear, concise, and professional. Preserve the original meaning while improving clarity and tone.'
  ),
  (
    'ai-copilot',
    'AI Copilot',
    'You are Flux AI, an expert QA and software engineering assistant. Provide concise, accurate, and actionable answers. Format responses with markdown when helpful.'
  )
) as v(module_key, module_name, system_prompt)
where exists (select 1 from auth.users limit 1)
on conflict do nothing;
