-- Migration 021: Create Project Master table and link it to weekly_reports

-- 1. Create projects table
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  project_name text not null unique,
  project_code text not null unique,
  description  text,
  status       text not null default 'Active',
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  is_active    boolean not null default true
);

-- Enable RLS
alter table public.projects enable row level security;

-- Policies for projects
drop policy if exists "projects_select" on public.projects;
drop policy if exists "projects_write" on public.projects;

create policy "projects_select" on public.projects for select using (true);
create policy "projects_write" on public.projects for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin' or
        p.role = 'admin' or
        public.check_module_permission(p.role, 'qa-report', 'can_configure')
      )
  )
);

-- 2. Alter weekly_reports table to add project_id reference
alter table public.weekly_reports add column if not exists project_id uuid references public.projects(id) on delete set null;

-- 3. Migrate existing report data
do $$
declare
  r record;
  p_id uuid;
  p_code text;
begin
  for r in select distinct project from public.weekly_reports loop
    p_code := upper(regexp_replace(r.project, '[^a-zA-Z0-9]', '', 'g'));
    -- ensure code is not empty
    if p_code = '' then
      p_code := 'PRJ' || floor(random() * 1000)::text;
    end if;
    
    -- Ensure code is unique
    while exists (select 1 from public.projects where project_code = p_code) loop
      p_code := p_code || floor(random() * 10)::text;
    end loop;

    insert into public.projects (project_name, project_code, is_active, status, description)
    values (r.project, p_code, true, 'Active', 'Automatically migrated project from Weekly Reports')
    on conflict (project_name) do update set project_name = excluded.project_name
    returning id into p_id;

    update public.weekly_reports
    set project_id = p_id
    where project = r.project;
  end loop;
end $$;

-- 4. Seed default project 'Flux AI' if no projects exist in the database
do $$
begin
  if not exists (select 1 from public.projects) then
    insert into public.projects (project_name, project_code, is_active, status, description)
    values ('Flux AI', 'FLUX', true, 'Active', 'Default system project');
  end if;
end $$;
