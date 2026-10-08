"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/AuthProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ---------- Small helpers used by the project cards ----------

// Accent colors for the project icons. Each project gets one of them,
// picked from its name, so the same project always has the same color
// (no database column is needed).
const PROJECT_COLORS = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-cyan-500",
  "from-rose-500 to-pink-500",
  "from-fuchsia-500 to-purple-500",
];

// Turns a project name into a number, then into one of the colors above
function getProjectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 1000003;
  }
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

// First letter of the project name, shown inside the colored icon
function getProjectInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "P";
}

// "https://www.sec.gov/edgar" -> "sec.gov" (only the website name, not the whole link)
function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// "2026-10-08T10:00:00Z" -> "Oct 8, 2026".
// Fixed English format, so "10/8/2026" can never be confused with 10 August.
function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  source_url?: string | null;
  documents_count: number;
  status: string;
  created_at: string;
  user_id?: string | null;
}

const DEFAULT_PROJECTS: Project[] = [
  {
    id: "d1a1b1c1-1111-4000-8000-000000000001",
    name: "Financial Document Intelligence",
    description: "Multi-agent extraction and automated ratio analysis on 10-K financial reports using PyMuPDF and LangGraph.",
    category: "Agentic Workflow",
    tags: ["LangGraph", "PyMuPDF", "FastAPI"],
    source_url: "https://sec.gov/edgar",
    documents_count: 14,
    status: "Active",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "d2a2b2c2-2222-4000-8000-000000000002",
    name: "Biomedical Literature Search",
    description: "Dense vector retrieval pipeline with Supabase pgvector and automated literature citation graph.",
    category: "Semantic Search",
    tags: ["Supabase", "pgvector", "RAG"],
    source_url: "https://pubmed.ncbi.nlm.nih.gov",
    documents_count: 86,
    status: "Active",
    created_at: "2026-10-03T14:30:00Z"
  },
  {
    id: "d3a3b3c3-3333-4000-8000-000000000003",
    name: "Regulatory Web Scraper",
    description: "Headless Chromium crawler driven by Playwright and BeautifulSoup4 for monitoring regulatory amendments.",
    category: "Document Extraction",
    tags: ["Playwright", "BeautifulSoup4", "Pandas"],
    source_url: "https://regulations.gov",
    documents_count: 42,
    status: "Active",
    created_at: "2026-10-04T09:15:00Z"
  }
];

const SQL_SCHEMA_TEXT = `-- Copy & paste into Supabase SQL Editor:
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

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete projects" ON public.projects FOR DELETE USING (true);`;

export default function ProjectsPage() {
  const supabase = createClient();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Supabase live status
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [supabaseNotice, setSupabaseNotice] = useState<string | null>(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  // NEW: the project whose details popup is open (null = popup closed)
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    category: "Agentic Workflow",
    tags: "",
    source_url: "",
    description: ""
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const saveLocalProjects = (updated: Project[]) => {
    setProjects(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("cognitive_projects", JSON.stringify(updated));
    }
  };

  // Load projects from Supabase with fallback
  const loadProjects = useCallback(async () => {
    setLoading(true);

    // 1. Attempt Supabase direct query
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        setSupabaseConnected(true);
        setSupabaseNotice(null);

        if (data.length > 0) {
          // Normalize tags in case postgres returned string
          const formatted = data.map((item) => ({
            ...item,
            tags: Array.isArray(item.tags)
              ? item.tags
              : typeof item.tags === "string"
              ? item.tags.replace(/[{}]/g, "").split(",").filter(Boolean)
              : []
          }));
          setProjects(formatted);
          saveLocalProjects(formatted);
          setLoading(false);
          return;
        } else {
          // Supabase table exists but is empty; show default sample templates
          setProjects(DEFAULT_PROJECTS);
          setLoading(false);
          return;
        }
      } else if (error) {
        console.warn("Supabase projects table query notice:", error.message);
        setSupabaseConnected(false);
        if (error.code === "PGRST205" || error.message.includes("Could not find the table")) {
          setSupabaseNotice("Table 'projects' does not exist in Supabase yet. Run the SQL schema to enable live cloud persistence.");
        } else {
          setSupabaseNotice(error.message);
        }
      }
    } catch (err: unknown) {
      console.warn("Supabase fetch exception:", err);
      setSupabaseConnected(false);
    }

    // 2. Fallback: Query backend API
    try {
      const res = await fetch(`${API_URL}/api/v1/projects`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Backend offline
    }

    // 3. Fallback: LocalStorage or Defaults
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cognitive_projects");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
            setLoading(false);
            return;
          }
        } catch {
          // parse failed
        }
      }
    }

    setProjects(DEFAULT_PROJECTS);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Esc key closes any open modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddModalOpen(false);
        setIsSqlModalOpen(false);
        setProjectToDelete(null);
        setProjectDetail(null); // NEW: also close the details popup
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Handle Add Project Submit
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    const parsedTags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const projectPayload = {
      name: formData.name.trim(),
      description: formData.description.trim() || "Cognitive pipeline workspace project.",
      category: formData.category,
      tags: parsedTags.length > 0 ? parsedTags : [formData.category],
      source_url: formData.source_url.trim() || null,
      documents_count: formData.source_url.trim() ? 1 : 0,
      status: "Active",
      user_id: user?.id || null
    };

    let createdProject: Project | null = null;
    let savedToSupabase = false;

    // 1. Insert directly into Supabase database
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert([projectPayload])
        .select()
        .single();

      if (!error && data) {
        createdProject = {
          ...data,
          tags: Array.isArray(data.tags) ? data.tags : projectPayload.tags
        } as Project;
        savedToSupabase = true;
        setSupabaseConnected(true);
        setSupabaseNotice(null);
      } else if (error) {
        console.warn("Supabase insert error:", error);
        if (error.code === "PGRST205" || error.message.includes("Could not find the table")) {
          setSupabaseNotice("Table 'projects' does not exist in Supabase yet. Run the SQL schema to enable live cloud persistence.");
        }
      }
    } catch (err: unknown) {
      console.warn("Supabase insert exception:", err);
    }

    // 2. Also notify backend API if available
    try {
      const res = await fetch(`${API_URL}/api/v1/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectPayload)
      });
      if (res.ok && !createdProject) {
        createdProject = await res.json();
      }
    } catch {
      // offline backend
    }

    // 3. Fallback object if offline
    if (!createdProject) {
      createdProject = {
        id: `proj-${Date.now()}`,
        name: projectPayload.name,
        description: projectPayload.description,
        category: projectPayload.category,
        tags: projectPayload.tags,
        source_url: projectPayload.source_url,
        documents_count: projectPayload.documents_count,
        status: "Active",
        created_at: new Date().toISOString(),
        user_id: user?.id || null
      };
    }

    const updated = [createdProject, ...projects.filter((p) => p.id !== createdProject!.id)];
    saveLocalProjects(updated);

    setFormData({
      name: "",
      category: "Agentic Workflow",
      tags: "",
      source_url: "",
      description: ""
    });
    setSubmitting(false);
    setIsAddModalOpen(false);

    if (savedToSupabase) {
      showToast(`Project "${createdProject.name}" created.`);
    } else {
      showToast(`Project "${createdProject.name}" created (saved in this browser only).`);
    }
  };

  // Handle Delete Project
  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    const targetId = projectToDelete.id;
    const targetName = projectToDelete.name;

    // Delete from Supabase
    try {
      await supabase.from("projects").delete().eq("id", targetId);
    } catch (err) {
      console.warn("Supabase delete failed:", err);
    }

    // Delete from backend API
    try {
      await fetch(`${API_URL}/api/v1/projects/${targetId}`, {
        method: "DELETE"
      });
    } catch {
      // offline backend
    }

    const updated = projects.filter((p) => p.id !== targetId);
    saveLocalProjects(updated);
    setProjectToDelete(null);
    showToast(`Project "${targetName}" removed.`);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_TEXT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const categories = ["All", "Agentic Workflow", "Semantic Search", "Document Extraction", "API Automation"];

  const filteredProjects = projects.filter((p) => {
    const matchesCategory =
      selectedCategory === "All" || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(query)));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-full py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl animate-fade-in backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      {/* Supabase Notice Banner if table needs migration */}
      {supabaseNotice && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs">
              <span className="font-semibold text-amber-100">Supabase Table Setup: </span>
              {supabaseNotice}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              View SQL Schema
            </button>
            <button
              onClick={() => loadProjects()}
              className="px-3 py-1.5 rounded-lg border border-amber-500/40 hover:bg-amber-500/20 text-amber-200 text-xs font-medium cursor-pointer transition-colors"
            >
              Retry Check
            </button>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-zinc-800">
        <div>
          {/* Title with a project counter and a tiny connection dot */}
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Projects
            {/* How many projects exist in total */}
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
              {projects.length}
            </span>
            {/* Connection dot (replaces the old "Supabase Live DB" pill).
                Green = saved in the database, yellow = saved in this browser only.
                Hover over it to read the text. */}
            <span
              title={
                supabaseConnected === true
                  ? "Connected to the database"
                  : "Working offline (saved in this browser only)"
              }
              className={`h-2 w-2 rounded-full ${
                supabaseConnected === true ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
          </h1>
          {/* Simple description (the old one was too technical) */}
          <p className="mt-2 text-sm text-zinc-400 max-w-xl">
            Your workspaces for documents and AI conversations. Open a project to chat with its documents.
          </p>
        </div>

        <div className="flex items-center gap-3">


          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Project
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search projects or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 px-3.5 py-1.5 pl-9 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-xl border border-zinc-800/60 bg-zinc-900/30 animate-pulse p-6" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
            <div className="mx-auto h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-300">No projects found</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {
                searchQuery || selectedCategory !== "All"
                ? "Try a different search or filter."
                : "Create your first project to get started."
              }
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
            >
              + Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                // NEW: clicking the card opens the details popup
                onClick={() => setProjectDetail(project)}
                // NEW: keyboard support. Enter or Space on the focused card opens it.
                // (e.target === e.currentTarget means the key was pressed on the card
                // itself, not on the buttons inside it)
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                    e.preventDefault();
                    setProjectDetail(project);
                  }
                }}
                role="button"
                tabIndex={0}
                className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/90 shadow-sm cursor-pointer"
              >
                <div>
                                    {/* Card header: colored icon + name + category */}
                  <div className="flex items-start gap-3">
                    {/* Colored square with the first letter of the project name */}
                    <div
                      className={`h-10 w-10 shrink-0 rounded-xl bg-linear-to-br ${getProjectColor(
                        project.name
                      )} flex items-center justify-center text-base font-bold text-white shadow-lg`}
                    >
                      {getProjectInitial(project.name)}
                    </div>

                    {/* Name (one line, "..." if too long) and category */}
                    <div className="min-w-0 flex-1">
                      <h3
                        title={project.name}
                        className="truncate text-base font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors"
                      >
                        {project.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] font-mono text-zinc-500">
                        {project.category}
                      </p>
                    </div>

                    {/* Status badge: shown only when the status is NOT "Active".
                        (Every project was "Active", so it told the user nothing.) */}
                    {project.status !== "Active" && (
                      <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                        {project.status}
                      </span>
                    )}
                  </div>

                  {/* Description (maximum 3 lines) */}
                  <p className="mt-4 text-xs leading-relaxed text-zinc-400 line-clamp-3">
                    {project.description}
                  </p>

                  {/* Source URL if present */}
                  {/* Show the link only if it is a real web address (starts with http/https).
                  Text like "abcd" is hidden on the card (it is still visible in the popup). */}
                  {project.source_url && /^https?:\/\//i.test(project.source_url) && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500 truncate font-mono">
                      <svg className="w-3.5 h-3.5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {/* Only the website name, e.g. "sec.gov" */}
                      <span className="truncate">{getDomain(project.source_url)}</span>
                    </div>
                  )}


                  {/* Tags: show only the first 3, then a "+N" chip for the rest */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {Array.isArray(project.tags) &&
                      project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[10px] font-mono text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}

                    {/* "+2" chip: appears only when the project has more than 3 tags */}
                    {Array.isArray(project.tags) && project.tags.length > 3 && (
                      <span className="rounded border border-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-500">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer details & Actions */}
                <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="flex flex-col gap-0.5 text-[11px] text-zinc-500 font-mono">
                    <span>{project.documents_count} {project.documents_count === 1 ? "doc" : "docs"} indexed</span>
                    <span className="text-[9px] text-zinc-600">
                      {formatDate(project.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/chat?project=${encodeURIComponent(project.name)}`}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white transition-colors"
                      title="Open in AI Copilot"
                      // NEW: stop this click from also opening the details popup
                      onClick={(e) => e.stopPropagation()}
                    >
                      Copilot &rarr;
                    </Link>

                    {/* Remove Project Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // NEW: do not open the details popup
                        setProjectToDelete(project);
                      }}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                      title="Remove Project"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

            {/* PROJECT DETAILS MODAL: opens when a project card is clicked */}
      {projectDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          onClick={() => setProjectDetail(null)} // clicking the dark background closes it
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${projectDetail.name} details`}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()} // clicks inside the popup must not close it
          >
            {/* Top row: category + status on the left, close (X) button on the right */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-indigo-300">
                  {projectDetail.category}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {projectDetail.status}
                </span>
              </div>
              <button
                onClick={() => setProjectDetail(null)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                aria-label="Close details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Project name + full description (the card shows only 3 lines of it) */}
            <h2 className="mt-4 text-xl font-bold text-white">{projectDetail.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {projectDetail.description || "No description added for this project."}
            </p>

            {/* Quick facts: documents count and created date */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Documents indexed</p>
                <p className="mt-1 text-lg font-semibold text-white">{projectDetail.documents_count}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Created</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {formatDate(projectDetail.created_at) || "-"}
                </p>
              </div>
            </div>

            {/* Source URL (only shown if the project has one).
                It becomes a clickable link only when it starts with http:// or https://,
                other text (like s3://bucket) is shown as plain text for safety. */}
            {projectDetail.source_url && (
              <div className="mt-5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Source</p>
                {/^https?:\/\//i.test(projectDetail.source_url) ? (
                  <a
                    href={projectDetail.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-xs font-mono text-indigo-400 underline hover:text-indigo-300"
                  >
                    {projectDetail.source_url}
                  </a>
                ) : (
                  <p className="mt-1 break-all text-xs font-mono text-zinc-300">
                    {projectDetail.source_url}
                  </p>
                )}
              </div>
            )}

            {/* Tags (only shown if the project has any) */}
            {Array.isArray(projectDetail.tags) && projectDetail.tags.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Tags</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {projectDetail.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[11px] font-mono text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom buttons: Close, and open this project in the chat page */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setProjectDetail(null)}
                className="px-4 py-2 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                Close
              </button>
              <Link
                href={`/chat?project=${encodeURIComponent(projectDetail.name)}`}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md"
              >
                Open in Copilot &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}



      {/* ADD PROJECT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Create New Project</h2>

              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal Compliance Analyzer"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Architecture Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Agentic Workflow">Agentic Workflow (LangGraph)</option>
                  <option value="Semantic Search">Semantic Search (pgvector & Supabase)</option>
                  <option value="Document Extraction">Document Extraction (PDF/Web Scraper)</option>
                  <option value="API Automation">API Automation (FastAPI Engine)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. LangGraph, PyMuPDF, Playwright"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Source Ingestion URL or Seed Path (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://example.com/reports or s3://bucket/docs"
                  value={formData.source_url}
                  onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of purpose, extraction objectives, and workflow goals..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Create Project</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL SCHEMA MODAL */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7h16m-16 5h16" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Supabase Schema Migration</h2>
                  <p className="text-xs text-zinc-400">Run this SQL in your Supabase Dashboard &rarr; SQL Editor</p>
                </div>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-zinc-400">schema.sql (Table: public.projects)</span>
                <button
                  onClick={handleCopySql}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  {copiedSql ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-400/90 overflow-x-auto max-h-72 select-all">
                <pre>{SQL_SCHEMA_TEXT}</pre>
              </div>

              <div className="mt-4 p-3 rounded-lg border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-300">How to apply:</p>
                <p>1. Open your <a href="https://supabase.com/dashboard/project/nhcwsslenciehwsbcswg/sql" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300">Supabase SQL Editor</a>.</p>
                <p>2. Paste the SQL script above and click <span className="text-emerald-400 font-semibold">Run</span>.</p>
                <p>3. Return here and click &ldquo;Retry Check&rdquo; or refresh the page.</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-900/50 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Project</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-zinc-300">
              Are you sure you want to remove <span className="font-semibold text-white">&ldquo;{projectToDelete.name}&rdquo;</span> from the workspace and database?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md cursor-pointer"
              >
                Yes, Remove Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
