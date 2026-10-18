-- ==============================================================================
-- Cognitive Workspace: Supabase Unified Schema & Conflict-Free Migration
-- Hierarchical Architecture: Projects (Parent) -> Stories (Child) -> Tasks (Child)
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Go to "SQL Editor" -> Click "New Query"
-- 3. Paste this entire script and click "RUN".
-- ==============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Automated timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 1. Table: public.projects (Level 1: Root Parent)
-- ==============================================================================
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

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Agentic Workflow';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS documents_count INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.projects ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow insert projects" ON public.projects;
DROP POLICY IF EXISTS "Allow update projects" ON public.projects;
DROP POLICY IF EXISTS "Allow delete projects" ON public.projects;
CREATE POLICY "Allow read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete projects" ON public.projects FOR DELETE USING (true);

-- ==============================================================================
-- Clean drop of child tables to guarantee 100% type alignment:
-- projects.id is UUID -> stories.project_id is UUID
-- stories.id is TEXT -> tasks.story_id is TEXT
-- tasks.id is TEXT (supports both task-001 and UUID strings)
-- ==============================================================================
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;

-- ==============================================================================
-- 2. Table: public.stories (Level 2: Child of Projects)
-- ==============================================================================
CREATE TABLE public.stories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    project_name TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'review', 'completed')),
    due_date TIMESTAMPTZ,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stories_project_id ON public.stories(project_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at DESC);

DROP TRIGGER IF EXISTS trigger_stories_updated_at ON public.stories;
CREATE TRIGGER trigger_stories_updated_at
    BEFORE UPDATE ON public.stories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read stories" ON public.stories;
DROP POLICY IF EXISTS "Allow insert stories" ON public.stories;
DROP POLICY IF EXISTS "Allow update stories" ON public.stories;
DROP POLICY IF EXISTS "Allow delete stories" ON public.stories;
CREATE POLICY "Allow read stories" ON public.stories FOR SELECT USING (true);
CREATE POLICY "Allow insert stories" ON public.stories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update stories" ON public.stories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete stories" ON public.stories FOR DELETE USING (true);

-- ==============================================================================
-- 3. Table: public.tasks (Level 3: Child of Stories, Linked to Projects)
-- ==============================================================================
CREATE TABLE public.tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    story_id TEXT REFERENCES public.stories(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    stage TEXT NOT NULL DEFAULT 'todo' CHECK (stage IN ('todo', 'in_progress', 'review', 'done')),
    due_date TIMESTAMPTZ,
    project_name TEXT,
    story_title TEXT,
    descriptive_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
    assigned_to_id TEXT,
    assigned_to_name TEXT,
    assigned_to_role TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_story_id ON public.tasks(story_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_stage ON public.tasks(stage);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON public.tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow delete tasks" ON public.tasks;
CREATE POLICY "Allow read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update tasks" ON public.tasks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete tasks" ON public.tasks FOR DELETE USING (true);

-- ==============================================================================
-- 4. Table: public.members (Talent Ecosystem & Cute Owl Avatars)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role_type TEXT NOT NULL CHECK (role_type IN ('manager', 'developer')),
    role_title TEXT NOT NULL,
    department TEXT DEFAULT 'Engineering',
    avatar_color TEXT DEFAULT 'from-blue-600 to-cyan-500',
    owl_avatar TEXT DEFAULT 'avatar-1',
    system_role TEXT DEFAULT 'Admin',
    status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    assigned_projects TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS owl_avatar TEXT DEFAULT 'avatar-1';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS system_role TEXT DEFAULT 'Admin';
CREATE INDEX IF NOT EXISTS idx_members_role_type ON public.members(role_type);
CREATE INDEX IF NOT EXISTS idx_members_system_role ON public.members(system_role);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read members" ON public.members;
DROP POLICY IF EXISTS "Allow insert members" ON public.members;
DROP POLICY IF EXISTS "Allow update members" ON public.members;
DROP POLICY IF EXISTS "Allow delete members" ON public.members;
CREATE POLICY "Allow read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow insert members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update members" ON public.members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete members" ON public.members FOR DELETE USING (true);

-- ==============================================================================
-- 5. Automated Sync Trigger: auth.users -> public.members
-- Whenever ANY user signs up or signs in, they are immediately added to public.members!
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
    v_role TEXT;
    v_owl TEXT;
BEGIN
    v_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        CASE 
            WHEN lower(NEW.email) = 'anushaeswari1998@gmail.com' THEN 'Anusha'
            WHEN lower(NEW.email) = 'dharshan1620@gmail.com' THEN 'prem'
            WHEN lower(NEW.email) = 'mujebur.rahuman.a@gmail.com' THEN 'Noorul Rahuman M'
            WHEN lower(NEW.email) = 'premravan2000@gmail.com' THEN 'Prem Ravan'
            WHEN lower(NEW.email) = 'ramarao123@gmail.com' THEN 'Rama Rao'
            WHEN lower(NEW.email) = 'skprofessional321@gmail.com' THEN 'prince ♡'
            WHEN lower(NEW.email) = 'varthini1005@gmail.com' THEN 'Hemavarthini'
            ELSE split_part(NEW.email, '@', 1)
        END
    );

    IF lower(NEW.email) IN (
        'ramarao123@gmail.com', 'skprofessional321@gmail.com', 'anushaeswari1998@gmail.com',
        'dharshan1620@gmail.com', 'mujebur.rahuman.a@gmail.com', 'premravan2000@gmail.com',
        'varthini1005@gmail.com'
    ) THEN
        v_role := 'Admin';
    ELSE
        v_role := 'Developer';
    END IF;

    v_owl := CASE 
        WHEN lower(NEW.email) = 'ramarao123@gmail.com' THEN 'avatar-1'
        WHEN lower(NEW.email) = 'skprofessional321@gmail.com' THEN 'avatar-8'
        WHEN lower(NEW.email) = 'anushaeswari1998@gmail.com' THEN 'avatar-2'
        WHEN lower(NEW.email) = 'dharshan1620@gmail.com' THEN 'avatar-3'
        WHEN lower(NEW.email) = 'mujebur.rahuman.a@gmail.com' THEN 'avatar-4'
        WHEN lower(NEW.email) = 'premravan2000@gmail.com' THEN 'avatar-5'
        WHEN lower(NEW.email) = 'varthini1005@gmail.com' THEN 'avatar-6'
        ELSE 'avatar-7'
    END;

    INSERT INTO public.members (
        id, name, email, role_type, system_role, role_title, department,
        avatar_color, owl_avatar, status, skills, assigned_projects, created_at
    ) VALUES (
        NEW.id::text, v_name, NEW.email,
        CASE WHEN v_role = 'Admin' THEN 'manager' ELSE 'developer' END,
        v_role,
        CASE WHEN v_role = 'Admin' THEN 'Workspace Administrator' ELSE 'AI Engineer' END,
        'Engineering & Leadership', 'from-amber-500 to-yellow-600', v_owl, 'online',
        ARRAY['Agentic Workflows', 'Distributed Systems'],
        ARRAY['Financial Document Intelligence'],
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        status = 'online';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Trigger 2: Automatic Deletion Sync (auth.users -> public.members)
-- Whenever a user is deleted from Supabase Auth Dashboard, automatically remove them from public.members!
CREATE OR REPLACE FUNCTION public.handle_deleted_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.members WHERE id = OLD.id::text OR lower(email) = lower(OLD.email);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_auth_user();

-- Trigger 3: Metadata & Email Sync (auth.users -> public.members)
CREATE OR REPLACE FUNCTION public.handle_updated_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.members
    SET 
        email = NEW.email,
        name = COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
            NULLIF(NEW.raw_user_meta_data->>'name', ''),
            public.members.name
        )
    WHERE id = NEW.id::text OR lower(email) = lower(OLD.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE OF email, raw_user_meta_data ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_auth_user();

-- RPC Function: Delete User from both public.members and auth.users
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.members WHERE id = target_user_id;
    DELETE FROM auth.users WHERE id::text = target_user_id;
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. Realtime Publication Setup
-- ==============================================================================
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

-- ==============================================================================
-- 7. Seed Projects (Parent)
-- ==============================================================================
INSERT INTO public.projects (id, name, title, description, category, tags, source_url, documents_count, status, created_at)
VALUES
    ('d1a1b1c1-1111-4000-8000-000000000001'::uuid, 'Financial Document Intelligence', 'Financial Document Intelligence', 'Multi-agent extraction and automated ratio analysis on 10-K financial reports using PyMuPDF and LangGraph.', 'Agentic Workflow', ARRAY['LangGraph', 'PyMuPDF', 'FastAPI'], 'https://sec.gov/edgar', 14, 'Active', '2026-10-01T10:00:00Z'),
    ('d2a2b2c2-2222-4000-8000-000000000002'::uuid, 'Biomedical Literature Search', 'Biomedical Literature Search', 'Dense vector retrieval pipeline with Supabase pgvector and automated literature citation graph.', 'Semantic Search', ARRAY['Supabase', 'pgvector', 'RAG'], 'https://pubmed.ncbi.nlm.nih.gov', 86, 'Active', '2026-10-03T14:30:00Z'),
    ('d3a3b3c3-3333-4000-8000-000000000003'::uuid, 'Regulatory Web Scraper', 'Regulatory Web Scraper', 'Headless Chromium crawler driven by Playwright and BeautifulSoup4 for monitoring regulatory amendments.', 'Document Extraction', ARRAY['Playwright', 'BeautifulSoup4', 'Pandas'], 'https://regulations.gov', 42, 'Active', '2026-10-04T09:15:00Z')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 8. Seed Stories (Child of Projects)
-- ==============================================================================
INSERT INTO public.stories (id, project_id, project_name, title, description, priority, status, due_date, progress, created_at)
VALUES
    ('story-001', 'd1a1b1c1-1111-4000-8000-000000000001'::uuid, 'Financial Document Intelligence', 'Autonomous 10-K Document Parsing & Extraction Pipeline', 'Multi-column tabular parsing, bounding box extraction, and SEC Edgar streaming queue for 10-K balance sheets.', 'high', 'in_progress', '2026-10-24T00:00:00Z', 50, '2026-10-04T10:00:00Z'),
    ('story-002', 'd1a1b1c1-1111-4000-8000-000000000001'::uuid, 'Financial Document Intelligence', 'LangGraph Cyclical State Reasoning & Audit Verifier', 'State transition guardrails, deadlock prevention, ratio validation benchmarks, and sliding overlap chunking.', 'urgent', 'in_progress', '2026-10-29T00:00:00Z', 60, '2026-10-05T11:00:00Z'),
    ('story-003', 'd2a2b2c2-2222-4000-8000-000000000002'::uuid, 'Biomedical Literature Search', 'Semantic Vector Grounding & PubMed Crawler', 'HNSW cosine distance configuration on Supabase pgvector and high-throughput PubMed BioC asynchronous ingest.', 'urgent', 'in_progress', '2026-10-18T00:00:00Z', 60, '2026-10-06T10:00:00Z'),
    ('story-004', 'd2a2b2c2-2222-4000-8000-000000000002'::uuid, 'Biomedical Literature Search', 'Citation Graph Claim Verification & Grounding Standards', 'Validate factual claim citation accuracy and establish zero-hallucination threshold score metrics.', 'medium', 'open', '2026-10-22T00:00:00Z', 0, '2026-10-07T14:00:00Z'),
    ('story-005', 'd3a3b3c3-3333-4000-8000-000000000003'::uuid, 'Regulatory Web Scraper', 'Stealth Federal Ingestion & Change Detection Engine', 'Headless Chromium Playwright session management, notice diff engine, and automated compliance webhooks.', 'urgent', 'in_progress', '2026-10-28T00:00:00Z', 45, '2026-10-07T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 9. Seed Tasks (Child of Stories, Scoped to Projects)
-- ==============================================================================
INSERT INTO public.tasks (id, story_id, project_id, project_name, story_title, title, description, priority, stage, status, due_date, assigned_to_id, assigned_to_name, assigned_to_role, descriptive_paths, created_at)
VALUES
    ('task-001', 'story-001', 'd1a1b1c1-1111-4000-8000-000000000001'::uuid, 'Financial Document Intelligence', 'Autonomous 10-K Document Parsing & Extraction Pipeline', 'Implement PyMuPDF 10-K Table Extraction Parser', 'Extract multi-column tabular balance sheets and income statements into structured JSON chunks with bounding boxes.', 'high', 'in_progress', 'in_progress', '2026-10-15T00:00:00Z', 'm-ramarao', 'Rama Rao', 'Workspace Architect & Executive Admin', ARRAY['rag-pipeline/extraction/pdf_tables.py', 'backend/app/api/parsers/sec_10k.py', 'docs/specs/10k_table_schema.json'], '2026-10-05T09:00:00Z'),
    ('task-002', 'story-002', 'd1a1b1c1-1111-4000-8000-000000000001'::uuid, 'Financial Document Intelligence', 'LangGraph Cyclical State Reasoning & Audit Verifier', 'Review LangGraph Multi-Agent Cognitive Loop State', 'Evaluate graph transition conditions and prevent recursive deadlocks in ratio calculation agent.', 'urgent', 'review', 'in_progress', '2026-10-12T00:00:00Z', 'm-prince', 'prince ♡', 'Core Systems & Agentic Engineering Lead', ARRAY['rag-pipeline/agents/financial_graph.py', 'backend/app/core/workflow_orchestrator.py', 'tests/agents/test_cycles.py'], '2026-10-06T11:20:00Z'),
    ('task-003', 'story-002', 'd1a1b1c1-1111-4000-8000-000000000001'::uuid, 'Financial Document Intelligence', 'LangGraph Cyclical State Reasoning & Audit Verifier', 'Unit Test Semantic Chunking Overlap Window', 'Verify 15% sliding window overlap preserves context boundaries across SEC disclosures.', 'medium', 'done', 'completed', '2026-10-08T00:00:00Z', 'm-ramarao', 'Rama Rao', 'Workspace Architect & Executive Admin', ARRAY['rag-pipeline/chunking/sliding_window.py', 'tests/unit/test_chunking.py'], '2026-10-02T14:00:00Z'),
    ('task-004', 'story-001', 'd1a1b1c1-1111-4000-8000-000000000001'::uuid, 'Financial Document Intelligence', 'Autonomous 10-K Document Parsing & Extraction Pipeline', 'Automate SEC Edgar RSS Feed Ingestion Webhook', 'Poll newly filed 10-K and 10-Q forms and queue them into Redis stream for asynchronous ingestion.', 'medium', 'todo', 'pending', '2026-10-24T00:00:00Z', 'm-prince', 'prince ♡', 'Core Systems & Agentic Engineering Lead', ARRAY['backend/app/services/sec_feed_listener.py', 'backend/app/workers/ingest_worker.py', 'config/sec_tickers.yaml'], '2026-10-08T09:30:00Z'),
    ('task-005', 'story-002', 'd1a1b1c1-1111-4000-8000-000000000001'::uuid, 'Financial Document Intelligence', 'LangGraph Cyclical State Reasoning & Audit Verifier', 'Benchmarking SEC Ratio Reasoning Accuracy vs SEC filings', 'Compare automated EBITDA & debt-to-equity ratio calculations against certified audited filings.', 'high', 'todo', 'pending', '2026-10-29T00:00:00Z', 'm-ramarao', 'Rama Rao', 'Workspace Architect & Executive Admin', ARRAY['evals/benchmarks/ratio_accuracy_eval.py', 'evals/datasets/sp500_historical_2025.csv'], '2026-10-09T10:00:00Z'),
    ('task-006', 'story-003', 'd2a2b2c2-2222-4000-8000-000000000002'::uuid, 'Biomedical Literature Search', 'Semantic Vector Grounding & PubMed Crawler', 'Configure Supabase pgvector Indexing & HNSW Cosine Distance', 'Set up m=16 ef_construction=64 on pubmed_abstracts embedding column for sub-50ms latency.', 'high', 'in_progress', 'in_progress', '2026-10-18T00:00:00Z', 'm-prince', 'prince ♡', 'Core Systems & Agentic Engineering Lead', ARRAY['supabase/migrations/20261001_pgvector_hnsw.sql', 'backend/app/db/vector_client.py'], '2026-10-07T10:15:00Z')
ON CONFLICT (id) DO NOTHING;

-- Cleanup legacy mock members if present
DELETE FROM public.members WHERE id IN ('m-001', 'm-002', 'm-003', 'd-001', 'd-002', 'd-003', 'd-004');

-- ==============================================================================
-- 10. Backfill Existing auth.users into public.members as Admins
-- ==============================================================================
INSERT INTO public.members (
    id, name, email, role_type, system_role, role_title, department,
    avatar_color, owl_avatar, status, skills, assigned_projects, created_at
)
SELECT
    u.id::text,
    COALESCE(
        NULLIF(u.raw_user_meta_data->>'full_name', ''),
        NULLIF(u.raw_user_meta_data->>'name', ''),
        CASE 
            WHEN lower(u.email) = 'anushaeswari1998@gmail.com' THEN 'Anusha'
            WHEN lower(u.email) = 'dharshan1620@gmail.com' THEN 'prem'
            WHEN lower(u.email) = 'mujebur.rahuman.a@gmail.com' THEN 'Noorul Rahuman M'
            WHEN lower(u.email) = 'premravan2000@gmail.com' THEN 'Prem Ravan'
            WHEN lower(u.email) = 'ramarao123@gmail.com' THEN 'Rama Rao'
            WHEN lower(u.email) = 'skprofessional321@gmail.com' THEN 'prince ♡'
            WHEN lower(u.email) = 'varthini1005@gmail.com' THEN 'Hemavarthini'
            ELSE split_part(u.email, '@', 1)
        END
    ) AS name,
    u.email,
    'manager' AS role_type,
    'Admin' AS system_role,
    CASE
        WHEN lower(u.email) = 'ramarao123@gmail.com' THEN 'Workspace Architect & Executive Admin'
        WHEN lower(u.email) = 'skprofessional321@gmail.com' THEN 'Core Systems & Agentic Engineering Lead'
        WHEN lower(u.email) = 'anushaeswari1998@gmail.com' THEN 'Lead Platform Administrator'
        WHEN lower(u.email) = 'dharshan1620@gmail.com' THEN 'Principal AI Systems Architect'
        WHEN lower(u.email) = 'mujebur.rahuman.a@gmail.com' THEN 'Executive Engineering Director'
        WHEN lower(u.email) = 'premravan2000@gmail.com' THEN 'Lead Infrastructure Architect'
        WHEN lower(u.email) = 'varthini1005@gmail.com' THEN 'Principal Cognitive Systems Admin'
        ELSE 'Workspace Administrator'
    END AS role_title,
    'Engineering & Leadership' AS department,
    'from-amber-500 to-yellow-600' AS avatar_color,
    CASE 
        WHEN lower(u.email) = 'ramarao123@gmail.com' THEN 'avatar-1'
        WHEN lower(u.email) = 'skprofessional321@gmail.com' THEN 'avatar-8'
        WHEN lower(u.email) = 'anushaeswari1998@gmail.com' THEN 'avatar-2'
        WHEN lower(u.email) = 'dharshan1620@gmail.com' THEN 'avatar-3'
        WHEN lower(u.email) = 'mujebur.rahuman.a@gmail.com' THEN 'avatar-4'
        WHEN lower(u.email) = 'premravan2000@gmail.com' THEN 'avatar-5'
        WHEN lower(u.email) = 'varthini1005@gmail.com' THEN 'avatar-6'
        ELSE 'avatar-7'
    END AS owl_avatar,
    'online' AS status,
    ARRAY['Multi-Agent Topology', 'System Governance', 'LangGraph Architecture'] AS skills,
    ARRAY['Financial Document Intelligence', 'Biomedical Literature Search', 'Regulatory Web Scraper'] AS assigned_projects,
    COALESCE(u.created_at, timezone('utc'::text, now())) AS created_at
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    system_role = 'Admin',
    role_type = 'manager';

-- ==============================================================================
-- 11. Explicit Seeds for all 7 Authenticated Workspace Members (Admins & Owls)
-- ==============================================================================
INSERT INTO public.members (id, name, email, role_type, system_role, role_title, department, avatar_color, owl_avatar, status, skills, assigned_projects)
VALUES
    ('m-ramarao', 'Rama Rao', 'ramarao123@gmail.com', 'manager', 'Admin', 'Workspace Architect & Executive Admin', 'Executive Architecture', 'from-amber-500 to-yellow-600', 'avatar-1', 'online', ARRAY['System Architecture', 'Multi-Agent Topology', 'Supabase Realtime'], ARRAY['Financial Document Intelligence', 'Biomedical Literature Search']),
    ('m-prince', 'prince ♡', 'skprofessional321@gmail.com', 'manager', 'Admin', 'Core Systems & Agentic Engineering Lead', 'Platform Engineering', 'from-rose-500 to-purple-600', 'avatar-8', 'online', ARRAY['LangGraph Orchestration', 'pgvector Systems', 'Next.js 16 Fullstack'], ARRAY['Financial Document Intelligence', 'Regulatory Web Scraper']),
    ('m-anusha', 'Anusha', 'anushaeswari1998@gmail.com', 'manager', 'Admin', 'Lead Platform Administrator', 'Engineering & Leadership', 'from-emerald-500 to-teal-600', 'avatar-2', 'online', ARRAY['Platform Architecture', 'AI Orchestration'], ARRAY['Financial Document Intelligence']),
    ('m-prem', 'prem', 'dharshan1620@gmail.com', 'manager', 'Admin', 'Principal Cognitive Systems Architect', 'Engineering & Leadership', 'from-sky-500 to-blue-600', 'avatar-3', 'online', ARRAY['Deep Vector Search', 'LangGraph Reasoning'], ARRAY['Biomedical Literature Search']),
    ('m-noorul', 'Noorul Rahuman M', 'mujebur.rahuman.a@gmail.com', 'manager', 'Admin', 'Executive Engineering Director', 'Engineering & Leadership', 'from-violet-600 to-purple-700', 'avatar-4', 'online', ARRAY['Multi-Agent Governance', 'Enterprise Infrastructure'], ARRAY['Regulatory Web Scraper']),
    ('m-premravan', 'Prem Ravan', 'premravan2000@gmail.com', 'manager', 'Admin', 'Lead Infrastructure Architect', 'Engineering & Leadership', 'from-orange-500 to-amber-600', 'avatar-5', 'online', ARRAY['Cloud Automation', 'High Availability'], ARRAY['Financial Document Intelligence']),
    ('m-hemavarthini', 'Hemavarthini', 'varthini1005@gmail.com', 'manager', 'Admin', 'Principal Cognitive Systems Admin', 'Engineering & Leadership', 'from-pink-500 to-rose-600', 'avatar-6', 'online', ARRAY['Compliance Guardrails', 'Story Orchestration'], ARRAY['Biomedical Literature Search'])
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    system_role = 'Admin',
    role_type = 'manager',
    owl_avatar = EXCLUDED.owl_avatar;
