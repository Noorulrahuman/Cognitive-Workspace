/**
 * Consolidated Database Schema for Supabase (Projects, Stories, Tasks, Members, RLS, Realtime)
 * Externalized from client-side page bundles to reduce bundle size and compile latency.
 */

export const SQL_SCHEMA_TEXT = `-- ==============================================================================
-- Cognitive Workspace: Complete Supabase Schema (Projects -> Stories -> Tasks & Members)
-- ==============================================================================

-- 1. Table: public.projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    title TEXT,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Agentic Workflow',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    source_url TEXT,
    documents_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow insert projects" ON public.projects;
DROP POLICY IF EXISTS "Allow update projects" ON public.projects;
DROP POLICY IF EXISTS "Allow delete projects" ON public.projects;

CREATE POLICY "Allow read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete projects" ON public.projects FOR DELETE USING (true);

-- 2. Table: public.members
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role_type TEXT NOT NULL CHECK (role_type IN ('manager', 'developer')),
    role_title TEXT NOT NULL,
    system_role TEXT DEFAULT 'Developer',
    department TEXT DEFAULT 'Engineering',
    avatar_color TEXT DEFAULT 'from-indigo-600 to-sky-700',
    owl_avatar TEXT DEFAULT 'avatar-1',
    status TEXT DEFAULT 'online',
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    assigned_projects TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read members" ON public.members;
DROP POLICY IF EXISTS "Allow insert members" ON public.members;
DROP POLICY IF EXISTS "Allow update members" ON public.members;
DROP POLICY IF EXISTS "Allow delete members" ON public.members;

CREATE POLICY "Allow read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow insert members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update members" ON public.members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete members" ON public.members FOR DELETE USING (true);

-- 3. Table: public.stories (Child of Projects)
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'In Progress',
    priority TEXT NOT NULL DEFAULT 'medium',
    stage TEXT DEFAULT 'in_progress',
    progress INTEGER DEFAULT 0,
    due_date TIMESTAMPTZ,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read stories" ON public.stories;
DROP POLICY IF EXISTS "Allow insert stories" ON public.stories;
DROP POLICY IF EXISTS "Allow update stories" ON public.stories;
DROP POLICY IF EXISTS "Allow delete stories" ON public.stories;

CREATE POLICY "Allow read stories" ON public.stories FOR SELECT USING (true);
CREATE POLICY "Allow insert stories" ON public.stories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update stories" ON public.stories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete stories" ON public.stories FOR DELETE USING (true);

-- 4. Table: public.tasks (Child of Stories and Projects)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    stage TEXT DEFAULT 'todo',
    due_date TIMESTAMPTZ,
    project_name TEXT,
    descriptive_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
    assigned_to_id TEXT,
    assigned_to_name TEXT,
    assigned_to_role TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow delete tasks" ON public.tasks;

CREATE POLICY "Allow read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update tasks" ON public.tasks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete tasks" ON public.tasks FOR DELETE USING (true);

-- 5. Enable Supabase Realtime broadcast
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'projects') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'stories') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tasks') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
    END IF;
END $$;
`;
