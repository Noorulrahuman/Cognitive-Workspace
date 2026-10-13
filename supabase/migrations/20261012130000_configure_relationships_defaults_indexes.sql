-- ============================================================================
-- Migration: Configure database relationships, default values, and indexes
-- Target: public.projects & public.tasks
-- ============================================================================

-- 1. FOREIGN KEY RELATIONSHIPS & REFERENTIAL INTEGRITY
-- Ensure project_id on tasks references public.projects(id) with ON DELETE CASCADE
alter table public.tasks
    drop constraint if exists fk_tasks_project,
    add constraint fk_tasks_project
        foreign key (project_id)
        references public.projects(id)
        on delete cascade;

-- Ensure user ownership references auth.users(id)
alter table public.projects
    drop constraint if exists fk_projects_user,
    add constraint fk_projects_user
        foreign key (user_id)
        references auth.users(id)
        on delete cascade;

alter table public.tasks
    drop constraint if exists fk_tasks_user,
    add constraint fk_tasks_user
        foreign key (user_id)
        references auth.users(id)
        on delete cascade;

-- 2. DEFAULT VALUES CONFIGURATION
-- Projects table defaults
alter table public.projects
    alter column id set default gen_random_uuid(),
    alter column status set default 'active',
    alter column created_at set default timezone('utc'::text, now()),
    alter column updated_at set default timezone('utc'::text, now());

-- Tasks table defaults
alter table public.tasks
    alter column id set default gen_random_uuid(),
    alter column status set default 'pending',
    alter column priority set default 'medium',
    alter column created_at set default timezone('utc'::text, now()),
    alter column updated_at set default timezone('utc'::text, now());

-- Enforce NOT NULL guarantees on critical fields
alter table public.projects
    alter column title set not null,
    alter column user_id set not null;

alter table public.tasks
    alter column title set not null,
    alter column project_id set not null,
    alter column user_id set not null;

-- 3. VALUE DOMAIN CONSTRAINTS (CHECK CONSTRAINTS)
alter table public.projects
    drop constraint if exists chk_projects_status,
    add constraint chk_projects_status
        check (status in ('active', 'completed', 'archived'));

alter table public.tasks
    drop constraint if exists chk_tasks_status,
    add constraint chk_tasks_status
        check (status in ('pending', 'in_progress', 'completed'));

alter table public.tasks
    drop constraint if exists chk_tasks_priority,
    add constraint chk_tasks_priority
        check (priority in ('low', 'medium', 'high', 'urgent'));

-- 4. OPTIMIZED PERFORMANCE INDEXES
-- Index for parent project lookups (Foreign Key indexing)
create index if not exists idx_tasks_project_id
    on public.tasks (project_id);

-- Index for user filtering (Foreign Key indexing)
create index if not exists idx_projects_user_id
    on public.projects (user_id);

create index if not exists idx_tasks_user_id
    on public.tasks (user_id);

-- Composite index: frequently querying tasks by project filtered by status
create index if not exists idx_tasks_project_status
    on public.tasks (project_id, status);

-- Composite index: querying tasks by project ordered by due date
create index if not exists idx_tasks_project_due_date
    on public.tasks (project_id, due_date nulls last);

-- Partial index: quick dashboard lookups for non-completed (active) tasks
create index if not exists idx_tasks_active_pending
    on public.tasks (user_id, status)
    where status in ('pending', 'in_progress');