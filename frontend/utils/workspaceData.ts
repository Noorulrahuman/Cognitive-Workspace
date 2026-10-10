"use client";

import { SupabaseClient } from "@supabase/supabase-js";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ==============================================================================
// TYPES
// ==============================================================================

export type MemberRoleType = "manager" | "developer";

export interface Member {
  id: string;
  name: string;
  email: string;
  role_type: MemberRoleType; // Separates managers and developers
  role_title: string;        // e.g. "Engineering Manager", "Lead AI Engineer"
  department: string;        // e.g. "Cognitive Architecture", "Core Platform"
  avatar_color: string;      // Tailwind gradient
  status: "online" | "away" | "offline";
  skills: string[];
  assigned_projects: string[];
  created_at: string;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStage = "todo" | "in_progress" | "review" | "done";

export interface Task {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  description: string;
  descriptive_paths?: string[]; // List of descriptive file / workflow / API paths
  priority: TaskPriority;
  stage: TaskStage;             // Stage where it is now (todo, in_progress, review, done)
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  assigned_to_role: string | null;
  due_date: string;             // ISO Date string YYYY-MM-DD
  created_at: string;
  updated_at?: string;
}

// ==============================================================================
// INITIAL SEED DATA
// ==============================================================================

export const DEFAULT_MEMBERS: Member[] = [
  // --- MANAGERS ---
  {
    id: "m-001",
    name: "Dr. Sarah Chen",
    email: "sarah.chen@cognitive.ai",
    role_type: "manager",
    role_title: "Head of Cognitive Architecture",
    department: "Executive & AI Strategy",
    avatar_color: "from-amber-500 to-rose-600",
    status: "online",
    skills: ["LangGraph Orchestration", "Multi-Agent Topology", "System Design"],
    assigned_projects: ["Financial Document Intelligence", "Regulatory Web Scraper"],
    created_at: "2026-09-15T08:00:00Z"
  },
  {
    id: "m-002",
    name: "Marcus Vance",
    email: "marcus.vance@cognitive.ai",
    role_type: "manager",
    role_title: "Product & Delivery Lead",
    department: "Product Management",
    avatar_color: "from-indigo-600 to-purple-600",
    status: "online",
    skills: ["Roadmap Planning", "Vector Search KPIs", "Agile Execution"],
    assigned_projects: ["Biomedical Literature Search", "Financial Document Intelligence"],
    created_at: "2026-09-18T09:30:00Z"
  },
  {
    id: "m-003",
    name: "Elena Rostova",
    email: "elena.rostova@cognitive.ai",
    role_type: "manager",
    role_title: "Engineering Manager (Data Pipelines)",
    department: "Platform Engineering",
    avatar_color: "from-pink-500 to-red-600",
    status: "away",
    skills: ["ETL Pipelines", "Compliance Guardrails", "Security Audits"],
    assigned_projects: ["Regulatory Web Scraper"],
    created_at: "2026-09-20T11:00:00Z"
  },

  // --- DEVELOPERS ---
  {
    id: "d-001",
    name: "Alex Rivera",
    email: "alex.rivera@cognitive.ai",
    role_type: "developer",
    role_title: "Senior LangGraph & Python Engineer",
    department: "AI Agent Development",
    avatar_color: "from-blue-600 to-cyan-500",
    status: "online",
    skills: ["Python", "LangGraph", "FastAPI", "Prompt Engineering"],
    assigned_projects: ["Financial Document Intelligence", "Regulatory Web Scraper"],
    created_at: "2026-09-25T10:00:00Z"
  },
  {
    id: "d-002",
    name: "Priya Sharma",
    email: "priya.sharma@cognitive.ai",
    role_type: "developer",
    role_title: "Fullstack Next.js & UI Engineer",
    department: "Frontend Experience",
    avatar_color: "from-emerald-500 to-teal-600",
    status: "online",
    skills: ["TypeScript", "Next.js 16", "Tailwind CSS", "React Query"],
    assigned_projects: ["Biomedical Literature Search", "Regulatory Web Scraper"],
    created_at: "2026-09-27T13:45:00Z"
  },
  {
    id: "d-003",
    name: "David Kim",
    email: "david.kim@cognitive.ai",
    role_type: "developer",
    role_title: "Document Ingestion & PyMuPDF Specialist",
    department: "Document Intelligence",
    avatar_color: "from-violet-600 to-indigo-600",
    status: "online",
    skills: ["PyMuPDF", "Playwright", "OCR Extraction", "Pandas"],
    assigned_projects: ["Financial Document Intelligence"],
    created_at: "2026-10-01T08:15:00Z"
  },
  {
    id: "d-004",
    name: "Sophia Taylor",
    email: "sophia.taylor@cognitive.ai",
    role_type: "developer",
    role_title: "Vector DB & Supabase Systems Dev",
    department: "Storage & Semantic Retrieval",
    avatar_color: "from-sky-500 to-indigo-500",
    status: "offline",
    skills: ["Supabase", "pgvector", "PostgreSQL", "Embeddings"],
    assigned_projects: ["Biomedical Literature Search"],
    created_at: "2026-10-02T14:20:00Z"
  }
];

export const DEFAULT_TASKS: Task[] = [
  // --- PROJECT 1: Financial Document Intelligence ---
  {
    id: "task-001",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    project_name: "Financial Document Intelligence",
    title: "Implement PyMuPDF 10-K Table Extraction Parser",
    description: "Extract multi-column tabular balance sheets and income statements into structured JSON chunks with bounding boxes.",
    descriptive_paths: [
      "rag-pipeline/extraction/pdf_tables.py",
      "backend/app/api/parsers/sec_10k.py",
      "docs/specs/10k_table_schema.json"
    ],
    priority: "high",
    stage: "in_progress",
    assigned_to_id: "d-003",
    assigned_to_name: "David Kim",
    assigned_to_role: "Document Ingestion Specialist",
    due_date: "2026-10-15",
    created_at: "2026-10-05T09:00:00Z"
  },
  {
    id: "task-002",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    project_name: "Financial Document Intelligence",
    title: "Review LangGraph Multi-Agent Cognitive Loop State",
    description: "Evaluate graph transition conditions and prevent recursive deadlocks in ratio calculation agent.",
    descriptive_paths: [
      "rag-pipeline/agents/financial_graph.py",
      "backend/app/core/workflow_orchestrator.py",
      "tests/agents/test_cycles.py"
    ],
    priority: "urgent",
    stage: "review",
    assigned_to_id: "m-001",
    assigned_to_name: "Dr. Sarah Chen",
    assigned_to_role: "Head of Cognitive Architecture",
    due_date: "2026-10-12",
    created_at: "2026-10-06T11:20:00Z"
  },
  {
    id: "task-003",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    project_name: "Financial Document Intelligence",
    title: "Unit Test Semantic Chunking Overlap Window",
    description: "Verify 15% sliding window overlap preserves context boundaries across SEC disclosures.",
    descriptive_paths: [
      "rag-pipeline/chunking/sliding_window.py",
      "tests/unit/test_chunking.py"
    ],
    priority: "medium",
    stage: "done",
    assigned_to_id: "d-001",
    assigned_to_name: "Alex Rivera",
    assigned_to_role: "Senior LangGraph Engineer",
    due_date: "2026-10-08",
    created_at: "2026-10-02T14:00:00Z"
  },
  {
    id: "task-004",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    project_name: "Financial Document Intelligence",
    title: "Automate SEC Edgar RSS Feed Ingestion Webhook",
    description: "Poll newly filed 10-K and 10-Q forms and queue them into Redis stream for asynchronous ingestion.",
    descriptive_paths: [
      "backend/app/services/sec_feed_listener.py",
      "backend/app/workers/ingest_worker.py",
      "config/sec_tickers.yaml"
    ],
    priority: "medium",
    stage: "todo",
    assigned_to_id: "d-003",
    assigned_to_name: "David Kim",
    assigned_to_role: "Document Ingestion Specialist",
    due_date: "2026-10-24",
    created_at: "2026-10-08T09:30:00Z"
  },
  {
    id: "task-005",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    project_name: "Financial Document Intelligence",
    title: "Benchmarking SEC Ratio Reasoning Accuracy vs SEC filings",
    description: "Compare automated EBITDA & debt-to-equity ratio calculations against certified audited filings.",
    descriptive_paths: [
      "evals/benchmarks/ratio_accuracy_eval.py",
      "evals/datasets/sp500_historical_2025.csv"
    ],
    priority: "high",
    stage: "todo",
    assigned_to_id: "m-002",
    assigned_to_name: "Marcus Vance",
    assigned_to_role: "Product & Delivery Lead",
    due_date: "2026-10-29",
    created_at: "2026-10-09T10:00:00Z"
  },

  // --- PROJECT 2: Biomedical Literature Search ---
  {
    id: "task-006",
    project_id: "d2a2b2c2-2222-4000-8000-000000000002",
    project_name: "Biomedical Literature Search",
    title: "Configure Supabase pgvector Indexing & HNSW Cosine Distance",
    description: "Set up m=16 ef_construction=64 on pubmed_abstracts embedding column for sub-50ms latency.",
    descriptive_paths: [
      "supabase/migrations/20261001_pgvector_hnsw.sql",
      "backend/app/db/vector_client.py"
    ],
    priority: "high",
    stage: "in_progress",
    assigned_to_id: "d-004",
    assigned_to_name: "Sophia Taylor",
    assigned_to_role: "Vector DB Engineer",
    due_date: "2026-10-18",
    created_at: "2026-10-07T10:15:00Z"
  },
  {
    id: "task-007",
    project_id: "d2a2b2c2-2222-4000-8000-000000000002",
    project_name: "Biomedical Literature Search",
    title: "Sign-off on RAG Citation Graph Grounding Standards",
    description: "Approve accuracy metrics and threshold scores for citation claims in biomedical synthesis.",
    descriptive_paths: [
      "docs/architecture/biomedical_citations.md",
      "rag-pipeline/grounding/verifier.py"
    ],
    priority: "medium",
    stage: "todo",
    assigned_to_id: "m-002",
    assigned_to_name: "Marcus Vance",
    assigned_to_role: "Product & Delivery Lead",
    due_date: "2026-10-22",
    created_at: "2026-10-08T15:00:00Z"
  },
  {
    id: "task-008",
    project_id: "d2a2b2c2-2222-4000-8000-000000000002",
    project_name: "Biomedical Literature Search",
    title: "PubMed BioC API Batch Ingest Script",
    description: "High-throughput asynchronous fetcher for PubMed XML papers using httpx and asyncio queues.",
    descriptive_paths: [
      "backend/app/ingestion/pubmed_bioc_crawler.py",
      "backend/app/models/pubmed_entry.py"
    ],
    priority: "urgent",
    stage: "review",
    assigned_to_id: "d-002",
    assigned_to_name: "Priya Sharma",
    assigned_to_role: "Fullstack Engineer",
    due_date: "2026-10-14",
    created_at: "2026-10-06T14:00:00Z"
  },

  // --- PROJECT 3: Regulatory Web Scraper ---
  {
    id: "task-009",
    project_id: "d3a3b3c3-3333-4000-8000-000000000003",
    project_name: "Regulatory Web Scraper",
    title: "Develop Headless Chromium Playwright Session Handler",
    description: "Handle JS-rendered federal register portal without triggering automated bot challenges.",
    descriptive_paths: [
      "rag-pipeline/crawler/playwright_session.py",
      "rag-pipeline/crawler/stealth_profile.json"
    ],
    priority: "urgent",
    stage: "in_progress",
    assigned_to_id: "d-002",
    assigned_to_name: "Priya Sharma",
    assigned_to_role: "Fullstack Engineer",
    due_date: "2026-10-14",
    created_at: "2026-10-07T16:30:00Z"
  },
  {
    id: "task-010",
    project_id: "d3a3b3c3-3333-4000-8000-000000000003",
    project_name: "Regulatory Web Scraper",
    title: "Automated Amendment Diffing & Webhook Dispatcher",
    description: "Generate structured diff changelog whenever government notices update.",
    descriptive_paths: [
      "backend/app/services/diff_engine.py",
      "backend/app/api/webhooks/alerts.py"
    ],
    priority: "low",
    stage: "todo",
    assigned_to_id: "m-003",
    assigned_to_name: "Elena Rostova",
    assigned_to_role: "Engineering Manager",
    due_date: "2026-10-28",
    created_at: "2026-10-09T08:00:00Z"
  },
  {
    id: "task-011",
    project_id: "d3a3b3c3-3333-4000-8000-000000000003",
    project_name: "Regulatory Web Scraper",
    title: "HTML DOM Content Sanitizer via BeautifulSoup4",
    description: "Strip header, footer, scripts, ads and extract pure regulatory article bodies.",
    descriptive_paths: [
      "rag-pipeline/extraction/soup_sanitizer.py",
      "tests/fixtures/sample_regulations_dom.html"
    ],
    priority: "high",
    stage: "done",
    assigned_to_id: "d-001",
    assigned_to_name: "Alex Rivera",
    assigned_to_role: "Senior LangGraph Engineer",
    due_date: "2026-10-06",
    created_at: "2026-10-01T12:00:00Z"
  }
];

// ==============================================================================
// LOCAL STORAGE KEYS
// ==============================================================================

const LS_MEMBERS_KEY = "cognitive_workspace_members";
const LS_TASKS_KEY = "cognitive_workspace_tasks";

// ==============================================================================
// STAGE & PRIORITY METADATA
// ==============================================================================

export const STAGE_CONFIG: Record<
  TaskStage,
  { label: string; badge: string; border: string; bg: string; dot: string }
> = {
  todo: {
    label: "To Do",
    badge: "border-zinc-700 bg-zinc-800/80 text-zinc-300",
    border: "border-zinc-800",
    bg: "bg-zinc-900/50",
    dot: "bg-zinc-400",
  },
  in_progress: {
    label: "In Progress",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    border: "border-sky-500/30",
    bg: "bg-sky-950/20",
    dot: "bg-sky-400 animate-pulse",
  },
  review: {
    label: "In Review",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    border: "border-amber-500/30",
    bg: "bg-amber-950/20",
    dot: "bg-amber-400",
  },
  done: {
    label: "Completed",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/20",
    dot: "bg-emerald-400",
  },
};

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; badge: string; dot: string }
> = {
  low: {
    label: "Low",
    badge: "border-zinc-700/60 bg-zinc-800/50 text-zinc-400",
    dot: "bg-zinc-400",
  },
  medium: {
    label: "Medium",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    dot: "bg-blue-400",
  },
  high: {
    label: "High",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
  urgent: {
    label: "Urgent",
    badge: "border-rose-500/40 bg-rose-500/15 text-rose-300 font-semibold animate-pulse",
    dot: "bg-rose-400",
  },
};

// ==============================================================================
// DATA FETCHERS & MUTATIONS
// ==============================================================================

export async function fetchWorkspaceMembers(
  supabase?: SupabaseClient
): Promise<Member[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("role_type", { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        saveMembersLocal(data);
        return data;
      }
    } catch {
      // Table absent
    }
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/members`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveMembersLocal(data);
        return data;
      }
    }
  } catch {
    // Offline
  }

  if (typeof window !== "undefined") {
    const local = localStorage.getItem(LS_MEMBERS_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Parse error
      }
    }
  }

  saveMembersLocal(DEFAULT_MEMBERS);
  return DEFAULT_MEMBERS;
}

export function saveMembersLocal(members: Member[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(members));
    } catch {
      // Storage error
    }
  }
}

export async function addWorkspaceMember(
  newMember: Omit<Member, "id" | "created_at">,
  supabase?: SupabaseClient
): Promise<Member> {
  const memberWithId: Member = {
    ...newMember,
    id: `m-${Date.now().toString(36)}`,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from("members").insert([memberWithId]);
    } catch {
      // Ignored
    }
  }

  const existing = await fetchWorkspaceMembers();
  const updated = [memberWithId, ...existing];
  saveMembersLocal(updated);
  return memberWithId;
}

export async function fetchWorkspaceTasks(
  supabase?: SupabaseClient
): Promise<Task[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        saveTasksLocal(data);
        return data;
      }
    } catch {
      // Ignored
    }
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/tasks`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveTasksLocal(data);
        return data;
      }
    }
  } catch {
    // Offline
  }

  if (typeof window !== "undefined") {
    const local = localStorage.getItem(LS_TASKS_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Parse error
      }
    }
  }

  saveTasksLocal(DEFAULT_TASKS);
  return DEFAULT_TASKS;
}

export function saveTasksLocal(tasks: Task[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LS_TASKS_KEY, JSON.stringify(tasks));
    } catch {
      // Storage error
    }
  }
}

export async function createWorkspaceTask(
  payload: Omit<Task, "id" | "created_at">,
  supabase?: SupabaseClient
): Promise<Task> {
  const newTask: Task = {
    ...payload,
    id: `task-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from("tasks").insert([newTask]);
    } catch {
      // Ignored
    }
  }

  if (typeof window !== "undefined") {
    const existing = await fetchWorkspaceTasks();
    const updated = [newTask, ...existing];
    saveTasksLocal(updated);
  }

  return newTask;
}

export async function updateWorkspaceTask(
  taskId: string,
  updates: Partial<Task>,
  supabase?: SupabaseClient
): Promise<Task[]> {
  const tasks = await fetchWorkspaceTasks();
  const updatedTasks = tasks.map((t) =>
    t.id === taskId
      ? { ...t, ...updates, updated_at: new Date().toISOString() }
      : t
  );

  saveTasksLocal(updatedTasks);

  if (supabase) {
    try {
      await supabase
        .from("tasks")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", taskId);
    } catch {
      // Ignored
    }
  }

  return updatedTasks;
}

export async function deleteWorkspaceTask(
  taskId: string,
  supabase?: SupabaseClient
): Promise<Task[]> {
  const tasks = await fetchWorkspaceTasks();
  const filtered = tasks.filter((t) => t.id !== taskId);
  saveTasksLocal(filtered);

  if (supabase) {
    try {
      await supabase.from("tasks").delete().eq("id", taskId);
    } catch {
      // Ignored
    }
  }

  return filtered;
}
