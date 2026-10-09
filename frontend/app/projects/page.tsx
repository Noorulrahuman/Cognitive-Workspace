"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import {
  Task,
  TaskStage,
  TaskPriority,
  Member,
  STAGE_CONFIG,
  PRIORITY_CONFIG,
  fetchWorkspaceTasks,
  fetchWorkspaceMembers,
  createWorkspaceTask,
  updateWorkspaceTask,
} from "@/utils/workspaceData";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const PROJECT_COLORS = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-cyan-500",
  "from-rose-500 to-pink-500",
  "from-fuchsia-500 to-purple-500",
];

function getProjectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 1000003;
  }
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

function getProjectInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "P";
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

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

CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role_type TEXT NOT NULL CHECK (role_type IN ('manager', 'developer')),
    role_title TEXT NOT NULL,
    department TEXT DEFAULT 'Engineering',
    avatar_color TEXT DEFAULT 'from-blue-600 to-cyan-500',
    status TEXT DEFAULT 'online',
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    assigned_projects TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    descriptive_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    stage TEXT NOT NULL DEFAULT 'todo' CHECK (stage IN ('todo', 'in_progress', 'review', 'done')),
    assigned_to_id TEXT,
    assigned_to_name TEXT,
    assigned_to_role TEXT,
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete projects" ON public.projects FOR DELETE USING (true);

CREATE POLICY "Allow read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow insert members" ON public.members FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update tasks" ON public.tasks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete tasks" ON public.tasks FOR DELETE USING (true);`;

export default function ProjectsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
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
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inline Add Task state inside project detail
  const [isInlineAddTaskOpen, setIsInlineAddTaskOpen] = useState<boolean>(false);
  const [inlineTaskForm, setInlineTaskForm] = useState({
    title: "",
    description: "",
    assigned_to_id: "",
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    priority: "medium" as TaskPriority,
    stage: "todo" as TaskStage,
  });

  // Project form states
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

  // Load projects, tasks, and members
  const loadWorkspaceData = useCallback(async () => {
    setLoading(true);

    // Load tasks & members in parallel
    const [tasksData, membersData] = await Promise.all([
      fetchWorkspaceTasks(supabase),
      fetchWorkspaceMembers(supabase),
    ]);
    setTasks(tasksData);
    setMembers(membersData);

    // 1. Attempt Supabase direct query for projects
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        setSupabaseConnected(true);
        setSupabaseNotice(null);

        if (data.length > 0) {
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
          setProjects(DEFAULT_PROJECTS);
          setLoading(false);
          return;
        }
      } else if (error) {
        setSupabaseConnected(false);
        if (error.code === "PGRST205" || error.message.includes("Could not find the table")) {
          setSupabaseNotice("Table 'projects' does not exist in Supabase yet. Run the SQL schema to enable live cloud persistence.");
        } else {
          setSupabaseNotice(error.message);
        }
      }
    } catch {
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

    // 3. Fallback: LocalStorage
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
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Map tasks by project
  const projectTasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      const key = t.project_name || t.project_id;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [tasks]);

  // Esc key closes modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddModalOpen(false);
        setIsSqlModalOpen(false);
        setProjectToDelete(null);
        setProjectDetail(null);
        setIsInlineAddTaskOpen(false);
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
      }
    } catch {
      // Ignored
    }

    if (!createdProject) {
      try {
        const res = await fetch(`${API_URL}/api/v1/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectPayload)
        });
        if (res.ok) createdProject = await res.json();
      } catch {
        // offline
      }
    }

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
      showToast(`Project "${createdProject.name}" created and synced to Supabase.`);
    } else {
      showToast(`Project "${createdProject.name}" created locally.`);
    }
  };

  // Handle Delete Project
  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    const targetId = projectToDelete.id;
    const targetName = projectToDelete.name;

    try {
      await supabase.from("projects").delete().eq("id", targetId);
    } catch {
      // Ignore
    }

    try {
      await fetch(`${API_URL}/api/v1/projects/${targetId}`, { method: "DELETE" });
    } catch {
      // Ignore
    }

    const updated = projects.filter((p) => p.id !== targetId);
    saveLocalProjects(updated);
    setProjectToDelete(null);
    showToast(`Project "${targetName}" removed.`);
  };

  // Add Task directly inside project detail
  const handleInlineAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectDetail || !inlineTaskForm.title.trim()) return;

    const assignedMember = members.find((m) => m.id === inlineTaskForm.assigned_to_id);

    const newTask = await createWorkspaceTask(
      {
        project_id: projectDetail.id,
        project_name: projectDetail.name,
        title: inlineTaskForm.title.trim(),
        description: inlineTaskForm.description.trim() || "Created from project details modal.",
        priority: inlineTaskForm.priority,
        stage: inlineTaskForm.stage,
        assigned_to_id: assignedMember ? assignedMember.id : null,
        assigned_to_name: assignedMember ? assignedMember.name : "Unassigned",
        assigned_to_role: assignedMember ? assignedMember.role_title : null,
        due_date: inlineTaskForm.due_date,
      },
      supabase
    );

    setTasks((prev) => [newTask, ...prev]);
    setIsInlineAddTaskOpen(false);
    setInlineTaskForm({
      title: "",
      description: "",
      assigned_to_id: "",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      priority: "medium",
      stage: "todo",
    });
    showToast(`Task "${newTask.title}" added to ${projectDetail.name}.`);
  };

  // Quick Advance Task Stage inside project detail
  const handleAdvanceTaskStage = async (task: Task) => {
    const order: TaskStage[] = ["todo", "in_progress", "review", "done"];
    const idx = order.indexOf(task.stage);
    const nextStage = order[(idx + 1) % order.length];
    const updated = await updateWorkspaceTask(task.id, { stage: nextStage }, supabase);
    setTasks(updated);
    showToast(`Task moved to ${STAGE_CONFIG[nextStage].label}.`);
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

  const detailProjectTasks = useMemo(() => {
    if (!projectDetail) return [];
    return tasks.filter(
      (t) => t.project_name === projectDetail.name || t.project_id === projectDetail.id
    );
  }, [projectDetail, tasks]);

  return (
    <div className="min-h-full py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl animate-fade-in backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      {/* Supabase Notice Banner */}
      {supabaseNotice && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs">
              <span className="font-semibold text-amber-100">Database Schema: </span>
              {supabaseNotice}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer transition shadow-xs"
            >
              View SQL Schema
            </button>
            <button
              onClick={loadWorkspaceData}
              className="px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-200 hover:bg-amber-500/20 text-xs font-semibold cursor-pointer transition"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Workspace Projects
            </h1>
            {supabaseConnected === true && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Supabase Live
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Cognitive document repositories, task workflows, and Gemini multi-agent knowledge graphs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-zinc-800 text-white shadow-xs font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search projects & tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-1.5 pl-9 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <svg className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <div className="h-8 w-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <p className="mt-3 text-xs font-mono">Synchronizing workspace projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
            <p className="text-sm font-semibold text-zinc-300">No projects found</p>
            <p className="mt-1 text-xs text-zinc-500">
              Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => {
              const projectTasks = projectTasksMap[project.name] || projectTasksMap[project.id] || [];
              const inProgressCount = projectTasks.filter((t) => t.stage === "in_progress").length;

              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${encodeURIComponent(project.id)}/tasks`)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 hover:border-indigo-500/50 hover:bg-zinc-900/80 transition-all shadow-md cursor-pointer"
                  title="Click to open project tasks workspace"
                >
                  <div>
                    {/* Top row: Icon + Category + Info button */}
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl bg-linear-to-br ${getProjectColor(
                          project.name
                        )} flex items-center justify-center text-sm font-bold text-white shadow-md`}
                      >
                        {getProjectInitial(project.name)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-indigo-300">
                          {project.category}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectDetail(project);
                          }}
                          className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition"
                          title="View project metadata"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h2 className="mt-4 text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {project.name}
                    </h2>
                    <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>

                    {/* Source URL if present */}
                    {project.source_url && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 truncate">
                        <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="truncate">{getDomain(project.source_url)}</span>
                      </div>
                    )}

                    {/* Tasks pill on Card */}
                    <div className="mt-3.5 flex items-center gap-2">
                      <Link
                        href={`/projects/${encodeURIComponent(project.id)}/tasks`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-500/25 bg-sky-500/10 hover:bg-sky-500/25 text-[11px] font-mono text-sky-300 transition"
                      >
                        <span>📋 {projectTasks.length} {projectTasks.length === 1 ? "task" : "tasks"}</span>
                        {inProgressCount > 0 && (
                          <span className="text-[10px] text-amber-300">({inProgressCount} active)</span>
                        )}
                        <span>&rarr;</span>
                      </Link>
                    </div>

                    {/* Tags */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Array.isArray(project.tags) &&
                        project.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[10px] font-mono text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
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
                      {/* Renamed Copilot to Gemini */}
                      <Link
                        href={`/chat?project=${encodeURIComponent(project.name)}`}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white transition-colors"
                        title="Open in AI Gemini"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Gemini &rarr;
                      </Link>

                      {/* Remove Project Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project);
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                        title="Remove Project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* PROJECT DETAILS & TASKS MODAL */}
      {/* ============================================================ */}
      {projectDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setProjectDetail(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${projectDetail.name} details`}
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top row */}
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

            {/* Project Name + Description */}
            <h2 className="mt-4 text-xl font-bold text-white">{projectDetail.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {projectDetail.description || "No description added for this project."}
            </p>

            {/* Facts: Documents count & Created */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Documents indexed</p>
                <p className="mt-1 text-lg font-semibold text-white">{projectDetail.documents_count}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Created Date</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {formatDate(projectDetail.created_at) || "-"}
                </p>
              </div>
            </div>

            {/* ============================================================ */}
            {/* TASKS SECTION FOR THIS PROJECT */}
            {/* ============================================================ */}
            <div className="mt-6 pt-5 border-t border-zinc-800">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Project Tasks ({detailProjectTasks.length})
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500">Milestones & Stages</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsInlineAddTaskOpen(!isInlineAddTaskOpen)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                  >
                    {isInlineAddTaskOpen ? "Close Form" : "+ Add Task"}
                  </button>
                  <Link
                    href={`/projects/${encodeURIComponent(projectDetail.id)}/tasks`}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                  >
                    Open Project Tasks &rarr;
                  </Link>
                </div>
              </div>

              {/* Inline Add Task Form */}
              {isInlineAddTaskOpen && (
                <form
                  onSubmit={handleInlineAddTask}
                  className="mb-4 p-4 rounded-xl border border-indigo-500/30 bg-zinc-950/80 space-y-3 animate-scale-up"
                >
                  <p className="text-xs font-bold text-indigo-300">
                    Add New Task to {projectDetail.name}
                  </p>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Task Title (e.g. Ingest 10-K tables via PyMuPDF)..."
                      value={inlineTaskForm.title}
                      onChange={(e) => setInlineTaskForm({ ...inlineTaskForm, title: e.target.value })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Assignee */}
                    <div>
                      <select
                        value={inlineTaskForm.assigned_to_id}
                        onChange={(e) =>
                          setInlineTaskForm({ ...inlineTaskForm, assigned_to_id: e.target.value })
                        }
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        <optgroup label="👑 Managers">
                          {members
                            .filter((m) => m.role_type === "manager")
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} (Manager)
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="⚡ Developers">
                          {members
                            .filter((m) => m.role_type === "developer")
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} (Developer)
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <select
                        value={inlineTaskForm.priority}
                        onChange={(e) =>
                          setInlineTaskForm({
                            ...inlineTaskForm,
                            priority: e.target.value as TaskPriority,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    {/* Due Date */}
                    <div>
                      <input
                        type="date"
                        required
                        value={inlineTaskForm.due_date}
                        onChange={(e) =>
                          setInlineTaskForm({ ...inlineTaskForm, due_date: e.target.value })
                        }
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsInlineAddTaskOpen(false)}
                      className="px-3 py-1 rounded-md text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                    >
                      Save Task
                    </button>
                  </div>
                </form>
              )}

              {/* Tasks List */}
              {detailProjectTasks.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                  No tasks created for this project yet. Click &ldquo;+ Add Task&rdquo; to assign one.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {detailProjectTasks.map((task) => {
                    const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                    const stageConf = STAGE_CONFIG[task.stage];

                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/70 hover:border-zinc-700 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`rounded border px-1.5 py-0.2 text-[9px] font-mono ${priorityConf.badge}`}>
                              {priorityConf.label}
                            </span>
                            <span className="text-xs font-semibold text-white truncate">
                              {task.title}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[10px] font-mono text-zinc-400">
                            <span>Assignee: <strong className="text-zinc-200">{task.assigned_to_name || "Unassigned"}</strong></span>
                            <span>Due: <strong className="text-zinc-200">{formatDate(task.due_date)}</strong></span>
                          </div>
                        </div>

                        {/* Stage Badge & Advance */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleAdvanceTaskStage(task)}
                            title="Click to advance stage"
                            className={`rounded-lg border px-2.5 py-1 text-[10px] font-mono font-medium transition cursor-pointer hover:scale-105 ${stageConf.badge}`}
                          >
                            {stageConf.label} &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setProjectDetail(null)}
                className="px-4 py-2 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                Close
              </button>
              <Link
                href={`/projects/${encodeURIComponent(projectDetail.id)}/tasks`}
                className="px-4 py-2 rounded-lg border border-sky-500/40 bg-sky-950/30 text-xs font-semibold text-sky-200 hover:bg-sky-900/50 hover:text-white transition"
              >
                Project Tasks &rarr;
              </Link>
              <Link
                href={`/chat?project=${encodeURIComponent(projectDetail.name)}`}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md transition"
              >
                Open in Gemini &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD PROJECT MODAL */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">Create New Project</h2>
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
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Architecture Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
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
                  Source Ingestion URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://example.com/reports"
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

      {/* ============================================================ */}
      {/* SQL SCHEMA MODAL */}
      {/* ============================================================ */}
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
                <span className="text-xs font-mono text-zinc-400">schema.sql (Projects, Members, Tasks)</span>
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

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
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
