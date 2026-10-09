-- ==============================================================================
-- Cognitive Workspace: Supabase Database Schema
-- Unified schema for Projects, Workspace Members, and Project Tasks
-- ==============================================================================

-- 1. Table: public.projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Agentic Workflow',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    source_url TEXT,
    documents_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete projects" ON public.projects FOR DELETE USING (true);

-- 2. Table: public.members (Separates Managers and Developers)
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role_type TEXT NOT NULL CHECK (role_type IN ('manager', 'developer')),
    role_title TEXT NOT NULL,
    department TEXT DEFAULT 'Engineering',
    avatar_color TEXT DEFAULT 'from-blue-600 to-cyan-500',
    status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    assigned_projects TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_role_type ON public.members(role_type);
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow insert members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update members" ON public.members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete members" ON public.members FOR DELETE USING (true);

-- 3. Table: public.tasks (Task Stage, Priority, Member Assignment, Due Date)
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    stage TEXT NOT NULL DEFAULT 'todo' CHECK (stage IN ('todo', 'in_progress', 'review', 'done')),
    assigned_to_id TEXT,
    assigned_to_name TEXT,
    assigned_to_role TEXT,
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_stage ON public.tasks(stage);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON public.tasks(assigned_to_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update tasks" ON public.tasks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete tasks" ON public.tasks FOR DELETE USING (true);

-- 4. Initial Seed Projects
INSERT INTO public.projects (id, name, description, category, tags, source_url, documents_count, status, created_at)
VALUES
    ('d1a1b1c1-1111-4000-8000-000000000001', 'Financial Document Intelligence', 'Multi-agent extraction and automated ratio analysis on 10-K financial reports using PyMuPDF and LangGraph.', 'Agentic Workflow', ARRAY['LangGraph', 'PyMuPDF', 'FastAPI'], 'https://sec.gov/edgar', 14, 'Active', '2026-10-01T10:00:00Z'),
    ('d2a2b2c2-2222-4000-8000-000000000002', 'Biomedical Literature Search', 'Dense vector retrieval pipeline with Supabase pgvector and automated literature citation graph.', 'Semantic Search', ARRAY['Supabase', 'pgvector', 'RAG'], 'https://pubmed.ncbi.nlm.nih.gov', 86, 'Active', '2026-10-03T14:30:00Z'),
    ('d3a3b3c3-3333-4000-8000-000000000003', 'Regulatory Web Scraper', 'Headless Chromium crawler driven by Playwright and BeautifulSoup4 for monitoring regulatory amendments.', 'Document Extraction', ARRAY['Playwright', 'BeautifulSoup4', 'Pandas'], 'https://regulations.gov', 42, 'Active', '2026-10-04T09:15:00Z')
ON CONFLICT (id) DO NOTHING;

-- 5. Initial Seed Members
INSERT INTO public.members (id, name, email, role_type, role_title, department, avatar_color, status, skills, assigned_projects)
VALUES
    ('m-001', 'Dr. Sarah Chen', 'sarah.chen@cognitive.ai', 'manager', 'Head of Cognitive Architecture', 'Executive & AI Strategy', 'from-amber-500 to-rose-600', 'online', ARRAY['LangGraph Orchestration', 'Multi-Agent Topology'], ARRAY['Financial Document Intelligence']),
    ('m-002', 'Marcus Vance', 'marcus.vance@cognitive.ai', 'manager', 'Product & Delivery Lead', 'Product Management', 'from-indigo-600 to-purple-600', 'online', ARRAY['Roadmap Planning', 'Vector Search KPIs'], ARRAY['Biomedical Literature Search']),
    ('m-003', 'Elena Rostova', 'elena.rostova@cognitive.ai', 'manager', 'Engineering Manager (Data Pipelines)', 'Platform Engineering', 'from-pink-500 to-red-600', 'away', ARRAY['ETL Pipelines', 'Compliance Guardrails'], ARRAY['Regulatory Web Scraper']),
    ('d-001', 'Alex Rivera', 'alex.rivera@cognitive.ai', 'developer', 'Senior LangGraph & Python Engineer', 'AI Agent Development', 'from-blue-600 to-cyan-500', 'online', ARRAY['Python', 'LangGraph', 'FastAPI'], ARRAY['Financial Document Intelligence']),
    ('d-002', 'Priya Sharma', 'priya.sharma@cognitive.ai', 'developer', 'Fullstack Next.js & UI Engineer', 'Frontend Experience', 'from-emerald-500 to-teal-600', 'online', ARRAY['TypeScript', 'Next.js 16', 'Tailwind CSS'], ARRAY['Regulatory Web Scraper']),
    ('d-003', 'David Kim', 'david.kim@cognitive.ai', 'developer', 'Document Ingestion & PyMuPDF Specialist', 'Document Intelligence', 'from-violet-600 to-indigo-600', 'online', ARRAY['PyMuPDF', 'Playwright', 'Pandas'], ARRAY['Financial Document Intelligence']),
    ('d-004', 'Sophia Taylor', 'sophia.taylor@cognitive.ai', 'developer', 'Vector DB & Supabase Systems Dev', 'Storage & Semantic Retrieval', 'from-sky-500 to-indigo-500', 'offline', ARRAY['Supabase', 'pgvector', 'PostgreSQL'], ARRAY['Biomedical Literature Search'])
ON CONFLICT (id) DO NOTHING;

-- 6. Initial Seed Tasks
INSERT INTO public.tasks (id, project_id, project_name, title, description, priority, stage, assigned_to_id, assigned_to_name, assigned_to_role, due_date)
VALUES
    ('task-001', 'd1a1b1c1-1111-4000-8000-000000000001', 'Financial Document Intelligence', 'Implement PyMuPDF 10-K Table Extraction Parser', 'Extract multi-column tabular balance sheets and income statements into structured JSON chunks.', 'high', 'in_progress', 'd-003', 'David Kim', 'Document Ingestion Specialist', '2026-10-15'),
    ('task-002', 'd1a1b1c1-1111-4000-8000-000000000001', 'Financial Document Intelligence', 'Review LangGraph Multi-Agent Cognitive Loop State', 'Evaluate graph transition conditions and prevent recursive deadlocks in ratio calculation agent.', 'urgent', 'review', 'm-001', 'Dr. Sarah Chen', 'Head of Cognitive Architecture', '2026-10-12'),
    ('task-003', 'd1a1b1c1-1111-4000-8000-000000000001', 'Financial Document Intelligence', 'Unit Test Semantic Chunking Overlap Window', 'Verify 15% sliding window overlap preserves context boundaries across SEC disclosures.', 'medium', 'done', 'd-001', 'Alex Rivera', 'Senior LangGraph Engineer', '2026-10-08'),
    ('task-004', 'd2a2b2c2-2222-4000-8000-000000000002', 'Biomedical Literature Search', 'Configure Supabase pgvector Indexing & HNSW Cosine Distance', 'Set up m=16 ef_construction=64 on pubmed_abstracts embedding column for sub-50ms latency.', 'high', 'in_progress', 'd-004', 'Sophia Taylor', 'Vector DB Engineer', '2026-10-18'),
    ('task-005', 'd2a2b2c2-2222-4000-8000-000000000002', 'Biomedical Literature Search', 'Sign-off on RAG Citation Graph Grounding Standards', 'Approve accuracy metrics and threshold scores for citation claims in biomedical synthesis.', 'medium', 'todo', 'm-002', 'Marcus Vance', 'Product & Delivery Lead', '2026-10-22'),
    ('task-006', 'd3a3b3c3-3333-4000-8000-000000000003', 'Regulatory Web Scraper', 'Develop Headless Chromium Playwright Session Handler', 'Handle JS-rendered federal register portal without triggering automated bot challenges.', 'urgent', 'in_progress', 'd-002', 'Priya Sharma', 'Fullstack Engineer', '2026-10-14')
ON CONFLICT (id) DO NOTHING;
