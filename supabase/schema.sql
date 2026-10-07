-- ==============================================================================
-- Cognitive Workspace: Supabase Database Schema
-- Table: public.projects
-- ==============================================================================

-- 1. Create table for storing project workspace details
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

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 4. Policies (allow authenticated users and workspace members full read/write)
DROP POLICY IF EXISTS "Allow read projects" ON public.projects;
CREATE POLICY "Allow read projects"
    ON public.projects FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow insert projects" ON public.projects;
CREATE POLICY "Allow insert projects"
    ON public.projects FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update projects" ON public.projects;
CREATE POLICY "Allow update projects"
    ON public.projects FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete projects" ON public.projects;
CREATE POLICY "Allow delete projects"
    ON public.projects FOR DELETE
    USING (true);

-- 5. Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_projects_updated_at();

-- 6. Initial Seed Data (Only inserted if table is empty)
INSERT INTO public.projects (id, name, description, category, tags, source_url, documents_count, status, created_at)
VALUES
    ('d1a1b1c1-1111-4000-8000-000000000001', 'Financial Document Intelligence', 'Multi-agent extraction and automated ratio analysis on 10-K financial reports using PyMuPDF and LangGraph.', 'Agentic Workflow', ARRAY['LangGraph', 'PyMuPDF', 'FastAPI'], 'https://sec.gov/edgar', 14, 'Active', '2026-10-01T10:00:00Z'),
    ('d2a2b2c2-2222-4000-8000-000000000002', 'Biomedical Literature Search', 'Dense vector retrieval pipeline with Supabase pgvector and automated literature citation graph.', 'Semantic Search', ARRAY['Supabase', 'pgvector', 'RAG'], 'https://pubmed.ncbi.nlm.nih.gov', 86, 'Active', '2026-10-03T14:30:00Z'),
    ('d3a3b3c3-3333-4000-8000-000000000003', 'Regulatory Web Scraper', 'Headless Chromium crawler driven by Playwright and BeautifulSoup4 for monitoring regulatory amendments.', 'Document Extraction', ARRAY['Playwright', 'BeautifulSoup4', 'Pandas'], 'https://regulations.gov', 42, 'Active', '2026-10-04T09:15:00Z')
ON CONFLICT (id) DO NOTHING;
