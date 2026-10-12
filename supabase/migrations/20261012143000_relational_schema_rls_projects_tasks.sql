-- ==============================================================================
-- Migration: 20261012143000_relational_schema_rls_projects_tasks.sql
-- Project: Cognitive Workspace
-- Description: Production-ready idempotent migration for public.projects and public.tasks.
--              Implements relational integrity, foreign key cascades, automated updated_at
--              triggers, optimized query indexes, and strict Row-Level Security (RLS)
--              with ownership inheritance for tasks through parent projects.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. AUTOMATED TIMESTAMP TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABLE: public.projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Idempotent column check and data migration for existing projects tables
DO $$
BEGIN
    -- Ensure user_id column exists and has foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Handle name vs title column migration idempotently
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'name'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'title'
        ) THEN
            ALTER TABLE public.projects ADD COLUMN name TEXT;
            UPDATE public.projects SET name = title WHERE name IS NULL;
            ALTER TABLE public.projects ALTER COLUMN name SET NOT NULL;
        ELSE
            ALTER TABLE public.projects ADD COLUMN name TEXT NOT NULL DEFAULT 'Untitled Project';
        END IF;
    END IF;

    -- Ensure description column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'description'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN description TEXT;
    END IF;

    -- Ensure created_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
    END IF;

    -- Ensure updated_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Enforce explicit foreign key constraint name if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_projects_user_id' AND table_name = 'projects'
    ) THEN
        ALTER TABLE public.projects
            DROP CONSTRAINT IF EXISTS projects_user_id_fkey,
            ADD CONSTRAINT fk_projects_user_id 
                FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. TABLE: public.tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Idempotent column check and migration for existing tasks tables
DO $$
BEGIN
    -- Ensure project_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;

    -- Ensure title column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'title'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled Task';
    END IF;

    -- Ensure description column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'description'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN description TEXT;
    END IF;

    -- Ensure status column exists and normalize existing values to fit check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'todo';
    ELSE
        -- Map legacy prototype statuses like 'pending' to 'todo'
        UPDATE public.tasks SET status = 'todo' WHERE status = 'pending' OR status IS NULL;
        ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'todo';
    END IF;

    -- Ensure created_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
    END IF;

    -- Ensure updated_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Enforce tasks foreign key and check constraint
ALTER TABLE public.tasks
    DROP CONSTRAINT IF EXISTS fk_tasks_project_id,
    DROP CONSTRAINT IF EXISTS tasks_project_id_fkey,
    DROP CONSTRAINT IF EXISTS fk_tasks_project,
    ADD CONSTRAINT fk_tasks_project_id 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
    DROP CONSTRAINT IF EXISTS chk_tasks_status,
    ADD CONSTRAINT chk_tasks_status 
        CHECK (status IN ('todo', 'in_progress', 'completed'));

-- 5. PERFORMANCE & LOOKUP INDEXES
-- Projects Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id 
    ON public.projects(user_id);

CREATE INDEX IF NOT EXISTS idx_projects_created_at 
    ON public.projects(created_at DESC);

-- Tasks Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id 
    ON public.tasks(project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
    ON public.tasks(project_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at 
    ON public.tasks(created_at DESC);

-- 6. AUTOMATED UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON public.tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. ROW LEVEL SECURITY (RLS) CONFIGURATION
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 8. GRANULAR RLS POLICIES: public.projects
-- Drop any legacy or overly permissive policies
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_update_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON public.projects;

-- Strict user ownership policies for projects (auth.uid() = user_id)
CREATE POLICY "projects_select_policy"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_policy"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_policy"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_policy"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 9. GRANULAR RLS POLICIES: public.tasks
-- Drop any legacy tasks policies
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;

-- Enforce ownership inheritance through projects:
-- Authenticated users can only operate on tasks if the parent project_id belongs to auth.uid()
CREATE POLICY "tasks_select_policy"
    ON public.tasks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = tasks.project_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "tasks_insert_policy"
    ON public.tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = tasks.project_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "tasks_update_policy"
    ON public.tasks
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = tasks.project_id
              AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = tasks.project_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "tasks_delete_policy"
    ON public.tasks
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = tasks.project_id
              AND p.user_id = auth.uid()
        )
    );
