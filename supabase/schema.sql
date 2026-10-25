-- ============================================================
-- NEXUS 工作台 · Supabase 建表脚本
-- 使用方法:登录 Supabase → 打开你的项目 → SQL Editor →
-- 粘贴本文件全部内容 → Run
-- ============================================================

-- ---------- 任务表 ----------
-- 作品集(个人网站对外展示的作品)
create table if not exists works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  category text not null default '',
  year text not null default '',
  description text not null default '',
  images jsonb not null default '[]'::jsonb,
  link text not null default '',
  created_at timestamptz not null default now()
);

alter table works enable row level security;
create policy "works 属于当前用户" on works for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
do $$
begin
  if not exists (select 1 from pg_publication_tables where publication_name = 'supabase_realtime' and tablename = 'works') then
    alter publication supabase_realtime add table works;
  end if;
end $$;

create table if not exists public.tasks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date date,
  completed_at timestamptz,
  subtasks jsonb not null default '[]',
  tags text not null default '{}',
  deleted_at timestamptz,
  recurrence text not null default 'none',
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- v2 新增列(已有用户重新执行本脚本即可,幂等)
alter table public.tasks add column if not exists subtasks jsonb not null default '[]';
alter table public.tasks add column if not exists tags text not null default '{}';
alter table public.tasks add column if not exists deleted_at timestamptz;
alter table public.tasks add column if not exists recurrence text not null default 'none';
alter table public.tasks add column if not exists focus_minutes int not null default 0;

-- ---------- 便签表 ----------
create table if not exists public.notes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text not null default '',
  color text not null default 'cyan' check (color in ('cyan', 'violet', 'amber', 'emerald', 'rose', 'slate')),
  pinned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes add column if not exists deleted_at timestamptz;

-- ---------- 快捷链接表 ----------
create table if not exists public.links (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  url text not null,
  "group" text not null default '未分组',
  created_at timestamptz not null default now()
);

-- ---------- 习惯打卡表 (v2) ----------
create table if not exists public.habits (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default '🎯',
  color text not null default 'cyan' check (color in ('cyan', 'violet', 'emerald', 'amber', 'rose')),
  dates jsonb not null default '[]',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- 倒数日表 (v2) ----------
create table if not exists public.milestones (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  date date not null,
  emoji text not null default '🎯',
  created_at timestamptz not null default now()
);

-- ---------- 每日心情表 (v4) ----------
create table if not exists public.dailies (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  mood int not null check (mood between 1 and 5),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dailies_user_date_idx on public.dailies (user_id, date);

drop trigger if exists dailies_set_updated_at on public.dailies;
create trigger dailies_set_updated_at
  before update on public.dailies
  for each row execute function public.set_updated_at();

-- ---------- 目标表 (v6) ----------
create table if not exists public.goals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  emoji text not null default '🎯',
  color text not null default 'cyan' check (color in ('cyan', 'violet', 'emerald', 'amber', 'rose')),
  tag text,
  mode text not null default 'auto' check (mode in ('auto', 'manual')),
  manual_progress int not null default 0 check (manual_progress between 0 and 100),
  deadline date,
  created_at timestamptz not null default now()
);

-- ---------- updated_at 自动更新触发器 ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------- 开启行级安全(RLS) ----------
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.links enable row level security;

-- 每张表:用户只能访问自己的数据
do $$
declare
  t text;
begin
  foreach t in array array['tasks', 'notes', 'links', 'habits', 'milestones', 'dailies', 'goals']
  loop
    execute format('drop policy if exists "%s_user_select" on public.%I', t, t);
    execute format('create policy "%s_user_select" on public.%I for select using (auth.uid() = user_id)', t, t);

    execute format('drop policy if exists "%s_user_insert" on public.%I', t, t);
    execute format('create policy "%s_user_insert" on public.%I for insert with check (auth.uid() = user_id)', t, t);

    execute format('drop policy if exists "%s_user_update" on public.%I', t, t);
    execute format('create policy "%s_user_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);

    execute format('drop policy if exists "%s_user_delete" on public.%I', t, t);
    execute format('create policy "%s_user_delete" on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end;
$$;

-- ---------- 开启实时同步(多设备/多标签页改动实时推送) ----------
-- 已加入 publication 的表会抛 duplicate_object,忽略即可
do $$
declare
  t text;
begin
  foreach t in array array['tasks', 'notes', 'links', 'habits', 'milestones', 'dailies', 'goals']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end;
$$;
