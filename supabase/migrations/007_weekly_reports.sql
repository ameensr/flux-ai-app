-- Migration 007: Create weekly_reports table for historical executive QA dashboards
create table if not exists public.weekly_reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  week            text not null,
  project         text not null,
  generated_date  timestamptz not null default now(),
  created_by      text not null,
  markdown        text not null,
  form_data       jsonb not null default '{}'::jsonb,
  status          text not null default 'Final',
  created_at      timestamptz not null default now()
);

-- Enable RLS
alter table public.weekly_reports enable row level security;

-- Add RLS Policies
drop policy if exists "weekly_reports_select_own" on public.weekly_reports;
drop policy if exists "weekly_reports_insert_own" on public.weekly_reports;
drop policy if exists "weekly_reports_update_own" on public.weekly_reports;
drop policy if exists "weekly_reports_delete_own" on public.weekly_reports;

create policy "weekly_reports_select_own" on public.weekly_reports
  for select using (auth.uid() = user_id);

create policy "weekly_reports_insert_own" on public.weekly_reports
  for insert with check (auth.uid() = user_id);

create policy "weekly_reports_update_own" on public.weekly_reports
  for update using (auth.uid() = user_id);

create policy "weekly_reports_delete_own" on public.weekly_reports
  for delete using (auth.uid() = user_id);
