"use client";

import { SupabaseClient } from "@supabase/supabase-js";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ==============================================================================
// TYPES
// ==============================================================================

export type MemberRoleType = "manager" | "developer";
export type SystemRole = "Admin" | "Manager" | "Developer" | "Viewer";

export interface ActivityLogItem {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role_type: MemberRoleType; // Separates managers and developers
  role_title: string;        // e.g. "Engineering Manager", "Lead AI Engineer"
  system_role?: SystemRole;  // System access tier (Admin, Member, Editor, Viewer)
  department: string;        // e.g. "Cognitive Architecture", "Core Platform"
  avatar_color: string;      // Tailwind gradient
  owl_avatar?: string;       // Cute owl avatar icon ID (e.g. "owl-gold", "owl-scholar", etc.)
  status: "online" | "away" | "offline";
  skills: string[];
  assigned_projects: string[];
  created_at: string;
  joined_date?: string;
  bio?: string;
  activity_log?: ActivityLogItem[];
}

export type StoryPriority = "low" | "medium" | "high" | "urgent";
export type StoryStatus = "open" | "in_progress" | "review" | "completed";

export interface Story {
  id: string;
  project_id: string;
  project_name?: string;
  title: string;
  description: string;
  priority: StoryPriority;
  status: StoryStatus;
  due_date: string;          // ISO Date string YYYY-MM-DD
  progress: number;          // 0 to 100 percentage calculated from child tasks
  created_at: string;
  updated_at?: string;
  syncedToSupabase?: boolean;
  syncError?: string;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStage = "todo" | "in_progress" | "review" | "done";

export interface Task {
  id: string;
  project_id: string;
  story_id?: string | null;  // Stories are child of projects; tasks are child of stories!
  story_title?: string | null;
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
  syncedToSupabase?: boolean;
  syncError?: string;
}

// ==============================================================================
// INITIAL SEED DATA
// ==============================================================================

export interface ProjectSeed {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  source_url?: string | null;
  documents_count: number;
  status: string;
  created_at: string;
}

export const DEFAULT_PROJECTS: ProjectSeed[] = [
  {
    id: "d1a1b1c1-1111-4000-8000-000000000001",
    name: "Financial Document Intelligence",
    description: "Multi-agent extraction and automated ratio analysis on 10-K financial reports using PyMuPDF and LangGraph.",
    category: "Agentic Workflow",
    tags: ["LangGraph", "PyMuPDF", "FastAPI"],
    source_url: "https://sec.gov/edgar",
    documents_count: 14,
    status: "Active",
    created_at: "2026-10-01T10:00:00Z",
  },
  {
    id: "d2a2b2c2-2222-4000-8000-000000000002",
    name: "Biomedical Literature Search",
    description: "Hybrid vector search across PubMed and Europe PMC with citation graph exploration and reranking.",
    category: "RAG & Search",
    tags: ["Hybrid Search", "PubMed", "Cohere Rerank"],
    source_url: "https://europepmc.org",
    documents_count: 8,
    status: "Active",
    created_at: "2026-10-02T11:00:00Z",
  },
  {
    id: "d3a3b3c3-3333-4000-8000-000000000003",
    name: "Regulatory Web Scraper",
    description: "Continuous monitoring of FDA and EMA regulatory notices with change diffing and slack alerts.",
    category: "Data Pipeline",
    tags: ["Playwright", "Diffing", "Webhooks"],
    source_url: "https://fda.gov",
    documents_count: 3,
    status: "Active",
    created_at: "2026-10-03T09:30:00Z",
  },
];

export const DEFAULT_MEMBERS: Member[] = [
  {
    id: "m-ramarao",
    name: "Rama Rao",
    email: "ramarao123@gmail.com",
    role_type: "manager",
    system_role: "Admin",
    role_title: "Workspace Co-Founder & Executive Admin",
    department: "Executive & AI Strategy",
    avatar_color: "from-amber-500 to-rose-600",
    owl_avatar: "avatar-1",
    status: "online",
    skills: ["System Architecture", "Autonomous Multi-Agent Cognition", "Enterprise Governance"],
    assigned_projects: ["Financial Document Intelligence", "Regulatory Web Scraper"],
    created_at: "2026-09-01T08:00:00Z",
    joined_date: "2026-09-01T08:00:00Z",
    bio: "Workspace Co-Founder and Executive Administrator with complete platform governance, role authority, and story orchestration permissions.",
    activity_log: [
      { id: "act-rr-1", action: "System initialized with Executive Admin privileges", timestamp: "2026-09-01T08:00:00Z" },
      { id: "act-rr-2", action: "Configured core workspace security & permissions matrix", timestamp: "2026-10-10T09:00:00Z" }
    ]
  },
  {
    id: "m-prince",
    name: "prince ♡",
    email: "skprofessional321@gmail.com",
    role_type: "manager",
    system_role: "Admin",
    role_title: "Core Systems & Agentic Engineering Lead",
    department: "Core Architecture & Systems",
    avatar_color: "from-rose-500 via-purple-600 to-indigo-600",
    owl_avatar: "avatar-8",
    status: "online",
    skills: ["Multi-Agent Topology", "Distributed Systems", "Full Platform Governance"],
    assigned_projects: ["Biomedical Literature Search", "Financial Document Intelligence"],
    created_at: "2026-09-01T08:00:00Z",
    joined_date: "2026-09-01T08:00:00Z",
    bio: "Principal Systems Architect and Workspace Administrator with full access across all workspace projects, stories, and task backlogs.",
    activity_log: [
      { id: "act-pr-1", action: "Configured multi-agent workspace pipelines and admin authority", timestamp: "2026-09-01T08:00:00Z" },
      { id: "act-pr-2", action: "Audited Supabase real-time story and task sync", timestamp: "2026-10-14T11:00:00Z" }
    ]
  },
  {
    id: "m-anusha",
    name: "Anusha",
    email: "anushaeswari1998@gmail.com",
    role_type: "manager",
    system_role: "Admin",
    role_title: "Lead Platform Administrator & AI Strategist",
    department: "AI Systems & Governance",
    avatar_color: "from-emerald-500 to-teal-600",
    owl_avatar: "avatar-2",
    status: "online",
    skills: ["Platform Architecture", "AI Orchestration", "Enterprise Administration"],
    assigned_projects: ["Financial Document Intelligence", "Biomedical Literature Search"],
    created_at: "2026-09-05T09:00:00Z",
    joined_date: "2026-09-05T09:00:00Z",
    bio: "Lead Platform Administrator overseeing agentic workflow execution and system security governance.",
    activity_log: [
      { id: "act-an-1", action: "Authenticated with Executive Admin credentials", timestamp: "2026-09-05T09:00:00Z" }
    ]
  },
  {
    id: "m-prem",
    name: "prem",
    email: "dharshan1620@gmail.com",
    role_type: "manager",
    system_role: "Admin",
    role_title: "Principal Cognitive Systems Architect",
    department: "Cognitive Computing",
    avatar_color: "from-sky-500 to-blue-600",
    owl_avatar: "avatar-3",
    status: "online",
    skills: ["Deep Vector Search", "LangGraph Reasoning", "Distributed Compute"],
    assigned_projects: ["Biomedical Literature Search", "Regulatory Web Scraper"],
    created_at: "2026-09-10T10:00:00Z",
    joined_date: "2026-09-10T10:00:00Z",
    bio: "Principal Cognitive Systems Architect directing distributed agent coordination and vector retrieval pipelines.",
    activity_log: [
      { id: "act-pm-1", action: "Joined core workspace leadership", timestamp: "2026-09-10T10:00:00Z" }
    ]
  },
  {
    id: "m-noorul",
    name: "Noorul Rahuman M",
    email: "mujebur.rahuman.a@gmail.com",
    role_type: "manager",
    system_role: "Admin",
    role_title: "Executive Engineering Director",
    department: "Executive Architecture",
    avatar_color: "from-violet-600 to-purple-700",
    owl_avatar: "avatar-4",
    status: "online",
    skills: ["Multi-Agent Governance", "Enterprise Infrastructure", "Production Deployments"],
    assigned_projects: ["Financial Document Intelligence", "Regulatory Web Scraper"],
    created_at: "2026-09-12T11:00:00Z",
    joined_date: "2026-09-12T11:00:00Z",
    bio: "Executive Engineering Director guiding cross-functional engineering teams, production deployments, and AI roadmap.",
    activity_log: [
      { id: "act-nr-1", action: "Platform governance and workspace authorization activated", timestamp: "2026-09-12T11:00:00Z" }
    ]
  },
  {
    id: "m-premravan",
    name: "Prem Ravan",
    email: "premravan2000@gmail.com",
    role_type: "manager",
    system_role: "Admin",
    role_title: "Lead Cloud Infrastructure Architect",
    department: "Platform Engineering",
    avatar_color: "from-orange-500 to-amber-600",
    owl_avatar: "avatar-5",
    status: "online",
    skills: ["Cloud Automation", "High Availability", "Database Scaling"],
    assigned_projects: ["Financial Document Intelligence", "Biomedical Literature Search"],
    created_at: "2026-09-15T12:00:00Z",
    joined_date: "2026-09-15T12:00:00Z",
    bio: "Lead Cloud Infrastructure Architect ensuring scalable, fault-tolerant execution of high-throughput agent jobs.",
    activity_log: [
      { id: "act-prv-1", action: "Configured cloud infrastructure & real-time pubsub", timestamp: "2026-09-15T12:00:00Z" }
    ]
  },
  {
    id: "m-hemavarthini",
    name: "Hemavarthini",
    email: "varthini1005@gmail.com",
    role_type: "manager",
    system_role: "Admin",
    role_title: "Principal Cognitive Governance Admin",
    department: "AI Governance & Assurance",
    avatar_color: "from-pink-500 to-rose-600",
    owl_avatar: "avatar-6",
    status: "online",
    skills: ["Compliance Guardrails", "Story Orchestration", "Model Verification"],
    assigned_projects: ["Regulatory Web Scraper", "Biomedical Literature Search"],
    created_at: "2026-09-18T14:00:00Z",
    joined_date: "2026-09-18T14:00:00Z",
    bio: "Principal Cognitive Governance Admin establishing hallucination metrics, compliance audit trails, and access control.",
    activity_log: [
      { id: "act-hv-1", action: "Enforced workspace assurance protocols and admin policy", timestamp: "2026-09-18T14:00:00Z" }
    ]
  }
];

export const DEFAULT_STORIES: Story[] = [
  // --- PROJECT 1: Financial Document Intelligence ---
  {
    id: "story-001",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    project_name: "Financial Document Intelligence",
    title: "Autonomous 10-K Document Parsing & Extraction Pipeline",
    description: "Multi-column tabular parsing, bounding box extraction, and SEC Edgar streaming queue for 10-K balance sheets.",
    priority: "high",
    status: "in_progress",
    due_date: "2026-10-24",
    progress: 50,
    created_at: "2026-10-04T10:00:00Z"
  },
  {
    id: "story-002",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    project_name: "Financial Document Intelligence",
    title: "LangGraph Cyclical State Reasoning & Audit Verifier",
    description: "State transition guardrails, deadlock prevention, ratio validation benchmarks, and sliding overlap chunking.",
    priority: "urgent",
    status: "in_progress",
    due_date: "2026-10-29",
    progress: 60,
    created_at: "2026-10-05T11:00:00Z"
  },
  // --- PROJECT 2: Biomedical Literature Search ---
  {
    id: "story-003",
    project_id: "d2a2b2c2-2222-4000-8000-000000000002",
    project_name: "Biomedical Literature Search",
    title: "Semantic Vector Grounding & PubMed Crawler",
    description: "HNSW cosine distance configuration on Supabase pgvector and high-throughput PubMed BioC asynchronous ingest.",
    priority: "urgent",
    status: "in_progress",
    due_date: "2026-10-18",
    progress: 60,
    created_at: "2026-10-06T10:00:00Z"
  },
  {
    id: "story-004",
    project_id: "d2a2b2c2-2222-4000-8000-000000000002",
    project_name: "Biomedical Literature Search",
    title: "Citation Graph Claim Verification & Grounding Standards",
    description: "Validate factual claim citation accuracy and establish zero-hallucination threshold score metrics.",
    priority: "medium",
    status: "open",
    due_date: "2026-10-22",
    progress: 0,
    created_at: "2026-10-07T14:00:00Z"
  },
  // --- PROJECT 3: Regulatory Web Scraper ---
  {
    id: "story-005",
    project_id: "d3a3b3c3-3333-4000-8000-000000000003",
    project_name: "Regulatory Web Scraper",
    title: "Stealth Federal Ingestion & Change Detection Engine",
    description: "Headless Chromium Playwright session management, notice diff engine, and automated compliance webhooks.",
    priority: "urgent",
    status: "in_progress",
    due_date: "2026-10-28",
    progress: 45,
    created_at: "2026-10-07T08:00:00Z"
  }
];

export const DEFAULT_TASKS: Task[] = [
  // --- PROJECT 1: Financial Document Intelligence ---
  {
    id: "task-001",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    story_id: "story-001",
    story_title: "Autonomous 10-K Document Parsing & Extraction Pipeline",
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
    assigned_to_id: "m-ramarao",
    assigned_to_name: "Rama Rao",
    assigned_to_role: "Workspace Co-Founder & Executive Admin",
    due_date: "2026-10-15",
    created_at: "2026-10-05T09:00:00Z"
  },
  {
    id: "task-002",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    story_id: "story-002",
    story_title: "LangGraph Cyclical State Reasoning & Audit Verifier",
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
    assigned_to_id: "m-prince",
    assigned_to_name: "prince ♡",
    assigned_to_role: "Lead Systems Architect & Workspace Admin",
    due_date: "2026-10-12",
    created_at: "2026-10-06T11:20:00Z"
  },
  {
    id: "task-003",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    story_id: "story-002",
    story_title: "LangGraph Cyclical State Reasoning & Audit Verifier",
    project_name: "Financial Document Intelligence",
    title: "Unit Test Semantic Chunking Overlap Window",
    description: "Verify 15% sliding window overlap preserves context boundaries across SEC disclosures.",
    descriptive_paths: [
      "rag-pipeline/chunking/sliding_window.py",
      "tests/unit/test_chunking.py"
    ],
    priority: "medium",
    stage: "done",
    assigned_to_id: "m-ramarao",
    assigned_to_name: "Rama Rao",
    assigned_to_role: "Workspace Co-Founder & Executive Admin",
    due_date: "2026-10-08",
    created_at: "2026-10-02T14:00:00Z"
  },
  {
    id: "task-004",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    story_id: "story-001",
    story_title: "Autonomous 10-K Document Parsing & Extraction Pipeline",
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
    assigned_to_id: "m-prince",
    assigned_to_name: "prince ♡",
    assigned_to_role: "Lead Systems Architect & Workspace Admin",
    due_date: "2026-10-24",
    created_at: "2026-10-08T09:30:00Z"
  },
  {
    id: "task-005",
    project_id: "d1a1b1c1-1111-4000-8000-000000000001",
    story_id: "story-002",
    story_title: "LangGraph Cyclical State Reasoning & Audit Verifier",
    project_name: "Financial Document Intelligence",
    title: "Benchmarking SEC Ratio Reasoning Accuracy vs SEC filings",
    description: "Compare automated EBITDA & debt-to-equity ratio calculations against certified audited filings.",
    descriptive_paths: [
      "evals/benchmarks/ratio_accuracy_eval.py",
      "evals/datasets/sp500_historical_2025.csv"
    ],
    priority: "high",
    stage: "todo",
    assigned_to_id: "m-ramarao",
    assigned_to_name: "Rama Rao",
    assigned_to_role: "Workspace Co-Founder & Executive Admin",
    due_date: "2026-10-29",
    created_at: "2026-10-09T10:00:00Z"
  },

  // --- PROJECT 2: Biomedical Literature Search ---
  {
    id: "task-006",
    project_id: "d2a2b2c2-2222-4000-8000-000000000002",
    story_id: "story-003",
    story_title: "Semantic Vector Grounding & PubMed Crawler",
    project_name: "Biomedical Literature Search",
    title: "Configure Supabase pgvector Indexing & HNSW Cosine Distance",
    description: "Set up m=16 ef_construction=64 on pubmed_abstracts embedding column for sub-50ms latency.",
    descriptive_paths: [
      "supabase/migrations/20261001_pgvector_hnsw.sql",
      "backend/app/db/vector_client.py"
    ],
    priority: "high",
    stage: "in_progress",
    assigned_to_id: "m-prince",
    assigned_to_name: "prince ♡",
    assigned_to_role: "Lead Systems Architect & Workspace Admin",
    due_date: "2026-10-18",
    created_at: "2026-10-07T10:15:00Z"
  },
  {
    id: "task-007",
    project_id: "d2a2b2c2-2222-4000-8000-000000000002",
    story_id: "story-004",
    story_title: "Citation Graph Claim Verification & Grounding Standards",
    project_name: "Biomedical Literature Search",
    title: "Sign-off on RAG Citation Graph Grounding Standards",
    description: "Approve accuracy metrics and threshold scores for citation claims in biomedical synthesis.",
    descriptive_paths: [
      "docs/architecture/biomedical_citations.md",
      "rag-pipeline/grounding/verifier.py"
    ],
    priority: "medium",
    stage: "todo",
    assigned_to_id: "m-ramarao",
    assigned_to_name: "Rama Rao",
    assigned_to_role: "Workspace Co-Founder & Executive Admin",
    due_date: "2026-10-22",
    created_at: "2026-10-08T15:00:00Z"
  },
  {
    id: "task-008",
    project_id: "d2a2b2c2-2222-4000-8000-000000000002",
    story_id: "story-003",
    story_title: "Semantic Vector Grounding & PubMed Crawler",
    project_name: "Biomedical Literature Search",
    title: "PubMed BioC API Batch Ingest Script",
    description: "High-throughput asynchronous fetcher for PubMed XML papers using httpx and asyncio queues.",
    descriptive_paths: [
      "backend/app/ingestion/pubmed_bioc_crawler.py",
      "backend/app/models/pubmed_entry.py"
    ],
    priority: "urgent",
    stage: "review",
    assigned_to_id: "m-prince",
    assigned_to_name: "prince ♡",
    assigned_to_role: "Lead Systems Architect & Workspace Admin",
    due_date: "2026-10-14",
    created_at: "2026-10-06T14:00:00Z"
  },

  // --- PROJECT 3: Regulatory Web Scraper ---
  {
    id: "task-009",
    project_id: "d3a3b3c3-3333-4000-8000-000000000003",
    story_id: "story-005",
    story_title: "Stealth Federal Ingestion & Change Detection Engine",
    project_name: "Regulatory Web Scraper",
    title: "Develop Headless Chromium Playwright Session Handler",
    description: "Handle JS-rendered federal register portal without triggering automated bot challenges.",
    descriptive_paths: [
      "rag-pipeline/crawler/playwright_session.py",
      "rag-pipeline/crawler/stealth_profile.json"
    ],
    priority: "urgent",
    stage: "in_progress",
    assigned_to_id: "m-ramarao",
    assigned_to_name: "Rama Rao",
    assigned_to_role: "Workspace Co-Founder & Executive Admin",
    due_date: "2026-10-14",
    created_at: "2026-10-07T16:30:00Z"
  },
  {
    id: "task-010",
    project_id: "d3a3b3c3-3333-4000-8000-000000000003",
    story_id: "story-005",
    story_title: "Stealth Federal Ingestion & Change Detection Engine",
    project_name: "Regulatory Web Scraper",
    title: "Automated Amendment Diffing & Webhook Dispatcher",
    description: "Generate structured diff changelog whenever government notices update.",
    descriptive_paths: [
      "backend/app/services/diff_engine.py",
      "backend/app/api/webhooks/alerts.py"
    ],
    priority: "low",
    stage: "todo",
    assigned_to_id: "m-prince",
    assigned_to_name: "prince ♡",
    assigned_to_role: "Lead Systems Architect & Workspace Admin",
    due_date: "2026-10-28",
    created_at: "2026-10-09T08:00:00Z"
  },
  {
    id: "task-011",
    project_id: "d3a3b3c3-3333-4000-8000-000000000003",
    story_id: "story-005",
    story_title: "Stealth Federal Ingestion & Change Detection Engine",
    project_name: "Regulatory Web Scraper",
    title: "HTML DOM Content Sanitizer via BeautifulSoup4",
    description: "Strip header, footer, scripts, ads and extract pure regulatory article bodies.",
    descriptive_paths: [
      "rag-pipeline/extraction/soup_sanitizer.py",
      "tests/fixtures/sample_regulations_dom.html"
    ],
    priority: "high",
    stage: "done",
    assigned_to_id: "m-ramarao",
    assigned_to_name: "Rama Rao",
    assigned_to_role: "Workspace Co-Founder & Executive Admin",
    due_date: "2026-10-06",
    created_at: "2026-10-01T12:00:00Z"
  }
];

// ==============================================================================
// LOCAL STORAGE KEYS
// ==============================================================================

const LS_MEMBERS_KEY = "cognitive_workspace_members";
const LS_TASKS_KEY = "cognitive_workspace_tasks";
const LS_STORIES_KEY = "cognitive_workspace_stories_v1";

// ==============================================================================
// STAGE & PRIORITY METADATA
// ==============================================================================

export const STORY_STATUS_CONFIG: Record<
  StoryStatus,
  { label: string; badge: string; dot: string }
> = {
  open: { label: "Open", badge: "border-zinc-700/80 bg-zinc-800/60 text-zinc-300", dot: "bg-zinc-400" },
  in_progress: { label: "In Progress", badge: "border-sky-500/25 bg-sky-500/10 text-sky-300", dot: "bg-sky-400 animate-pulse" },
  review: { label: "In Review", badge: "border-indigo-400/25 bg-indigo-500/10 text-indigo-200", dot: "bg-indigo-300" },
  completed: { label: "Completed", badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300", dot: "bg-emerald-400" },
};

export const STAGE_CONFIG: Record<
  TaskStage,
  { label: string; badge: string; border: string; bg: string; dot: string }
> = {
  todo: {
    label: "To Do",
    badge: "border-zinc-700/80 bg-zinc-800/60 text-zinc-300",
    border: "border-zinc-800",
    bg: "bg-zinc-900/50",
    dot: "bg-zinc-400",
  },
  in_progress: {
    label: "In Progress",
    badge: "border-sky-500/25 bg-sky-500/10 text-sky-300",
    border: "border-sky-500/20",
    bg: "bg-sky-950/15",
    dot: "bg-sky-400 animate-pulse",
  },
  review: {
    label: "In Review",
    badge: "border-indigo-400/25 bg-indigo-500/10 text-indigo-200",
    border: "border-indigo-500/20",
    bg: "bg-indigo-950/15",
    dot: "bg-indigo-300",
  },
  done: {
    label: "Completed",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    border: "border-emerald-500/20",
    bg: "bg-emerald-950/15",
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
    badge: "border-sky-500/20 bg-sky-500/10 text-sky-200",
    dot: "bg-sky-400",
  },
  high: {
    label: "High",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
  urgent: {
    label: "Urgent",
    badge: "border-rose-500/30 bg-rose-500/15 text-rose-300 font-medium",
    dot: "bg-rose-400",
  },
};

// ==============================================================================
// DATA FETCHERS & MUTATIONS
// ==============================================================================

// Helper to filter out legacy mock members (e.g. Dr. Sarah Chen, Marcus Vance, etc.)
const LEGACY_MOCK_NAMES = new Set([
  "dr. sarah chen",
  "sarah chen",
  "marcus vance",
  "elena rostova",
  "alex rivera",
  "priya sharma",
  "david kim",
  "sophia taylor",
]);

export function isLegacyMockMember(m: Partial<Member>): boolean {
  if (!m) return false;
  if (m.id && (m.id.startsWith("m-00") || m.id.startsWith("d-00"))) return true;
  if (m.name && LEGACY_MOCK_NAMES.has(m.name.toLowerCase().trim())) return true;
  return false;
}

export function isDefaultAdmin(name?: string | null, email?: string | null): boolean {
  if (!name && !email) return false;
  const n = (name || "").toLowerCase().trim();
  const e = (email || "").toLowerCase().trim();
  return (
    n.includes("rama rao") ||
    n.includes("ramarao") ||
    e.includes("ramarao") ||
    n.includes("prince") ||
    e.includes("skprofessional321") ||
    n.includes("anusha") ||
    e.includes("anushaeswari1998") ||
    n.includes("prem") ||
    e.includes("dharshan1620") ||
    e.includes("premravan2000") ||
    n.includes("noorul") ||
    e.includes("mujebur.rahuman") ||
    n.includes("hemavarthini") ||
    e.includes("varthini1005")
  );
}

// Permission checking helpers based on the 4-tier roles: Admin, Manager, Developer, Viewer
export function canManageRoles(role?: SystemRole | string): boolean {
  return role === "Admin";
}

export function canAddProjectsAndStories(role?: SystemRole | string): boolean {
  return role === "Admin" || role === "Manager";
}

export function canAddTasks(role?: SystemRole | string): boolean {
  return role === "Admin" || role === "Manager" || role === "Developer";
}

export function isViewerOnly(role?: SystemRole | string): boolean {
  return role === "Viewer";
}

export async function fetchWorkspaceMembers(
  supabase?: SupabaseClient
): Promise<Member[]> {
  let loadedMembers: Member[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        // Sanitize data: strip legacy mock members
        const cleaned = data
          .filter((m) => !isLegacyMockMember(m))
          .map((m) => {
            // "defaultly 'Rama Rao' and 'prince ♡' and others who already exist in supabase are Admins"
            let sysRole: SystemRole = (m.system_role as SystemRole) || "Developer";
            if (isDefaultAdmin(m.name, m.email) || !m.system_role || m.system_role === "Member" || m.system_role === "Editor") {
              sysRole = isDefaultAdmin(m.name, m.email) ? "Admin" : (m.system_role === "Editor" ? "Manager" : "Admin");
            }
            return {
              ...m,
              system_role: sysRole,
              role_type: (sysRole === "Admin" || sysRole === "Manager") ? "manager" : "developer",
            };
          });
        if (cleaned.length > 0) {
          loadedMembers = cleaned;
        }
      }
    } catch {
      // Table absent or offline
    }
  }

  if (loadedMembers.length === 0) {
    try {
      const res = await fetch(`${API_URL}/api/v1/members`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const cleaned = data.filter((m) => !isLegacyMockMember(m));
          if (cleaned.length > 0) {
            loadedMembers = cleaned;
          }
        }
      }
    } catch {
      // Offline
    }
  }

  if (loadedMembers.length === 0 && typeof window !== "undefined") {
    const local = localStorage.getItem(LS_MEMBERS_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((m) => !isLegacyMockMember(m));
          if (cleaned.length > 0) {
            loadedMembers = cleaned;
          }
        }
      } catch {
        // Parse error
      }
    }
  }

  // 1. Upgrade legacy email placeholders to active Supabase Auth emails if present
  loadedMembers = loadedMembers.map((m) => {
    let email = m.email;
    let owl = m.owl_avatar;
    if (m.name.toLowerCase().includes("rama rao") && m.email.includes("cognitive.ai")) {
      email = "ramarao123@gmail.com";
      owl = owl || "avatar-1";
    }
    if (m.name.toLowerCase().includes("prince") && m.email.includes("cognitive.ai")) {
      email = "skprofessional321@gmail.com";
      owl = owl || "avatar-8";
    }
    const isAdmin = isDefaultAdmin(m.name, email);
    const sysRole = isAdmin ? "Admin" : (m.system_role || "Developer");
    return {
      ...m,
      email,
      owl_avatar: owl || "avatar-1",
      system_role: sysRole as SystemRole,
      role_type: (sysRole === "Admin" || sysRole === "Manager") ? "manager" : "developer",
    };
  });

  // 2. Ensure all 7 Supabase Auth members from DEFAULT_MEMBERS are present in directory
  const existingEmails = new Set(loadedMembers.map((m) => m.email.toLowerCase().trim()));
  const existingNames = new Set(loadedMembers.map((m) => m.name.toLowerCase().trim()));
  for (const defMember of DEFAULT_MEMBERS) {
    const hasEmail = existingEmails.has(defMember.email.toLowerCase().trim());
    const hasName = existingNames.has(defMember.name.toLowerCase().trim());
    if (!hasEmail && !hasName) {
      loadedMembers.push(defMember);
      existingEmails.add(defMember.email.toLowerCase().trim());
      existingNames.add(defMember.name.toLowerCase().trim());
    }
  }

  saveMembersLocal(loadedMembers);
  return loadedMembers;
}

export function saveMembersLocal(members: Member[]) {
  if (typeof window !== "undefined") {
    try {
      // Always filter out any legacy mock members before saving
      const cleaned = members.filter((m) => !isLegacyMockMember(m));
      localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(cleaned));
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
  const updated = [memberWithId, ...existing.filter((m) => m.id !== memberWithId.id)];
  saveMembersLocal(updated);
  return memberWithId;
}

/**
 * Removes a member from the workspace directory and Supabase.
 * If Supabase RPC delete_user_by_admin is present, also removes from auth.users.
 */
export async function deleteWorkspaceMember(
  memberId: string,
  supabase?: SupabaseClient
): Promise<Member[]> {
  const currentMembers = await fetchWorkspaceMembers();
  const updated = currentMembers.filter((m) => m.id !== memberId);
  saveMembersLocal(updated);

  if (supabase) {
    try {
      await supabase.from("members").delete().eq("id", memberId);
      await supabase.rpc("delete_user_by_admin", { target_user_id: memberId });
    } catch (err) {
      console.warn("deleteWorkspaceMember remote delete warning:", err);
    }
  }

  return updated;
}

// ------------------------------------------------------------------------------
// ROLE ASSIGNMENT & REAL-TIME SYNCHRONIZATION HELPERS
// ------------------------------------------------------------------------------

/**
 * Updates a member's system role privilege.
 * Only Workspace Admins should trigger this function.
 */
export async function updateUserRole(
  userId: string,
  newRole: SystemRole,
  supabase?: SupabaseClient
): Promise<{ success: boolean; updatedMember: Member | null; payload: { userId: string; role: SystemRole; updated_at: string } }> {
  const timestamp = new Date().toISOString();
  const payload = {
    userId,
    role: newRole,
    updated_at: timestamp,
  };

  console.info("[ROLE UPDATE DISPATCH] PATCH /api/members/" + userId + "/role", payload);

  const members = await fetchWorkspaceMembers(supabase);
  let updatedMember: Member | null = null;

  const updatedMembers = members.map((m) => {
    if (m.id === userId) {
      const newActivity: ActivityLogItem = {
        id: `act-${Date.now().toString(36)}`,
        action: `Assigned role privilege: ${newRole}`,
        timestamp,
        details: `Privilege updated from ${m.system_role || "Developer"} to ${newRole}`,
      };
      const updated: Member = {
        ...m,
        system_role: newRole,
        role_type: (newRole === "Admin" || newRole === "Manager") ? "manager" : "developer",
        activity_log: [newActivity, ...(m.activity_log || [])],
      };
      updatedMember = updated;
      return updated;
    }
    return m;
  });

  saveMembersLocal(updatedMembers);

  if (supabase && updatedMember) {
    try {
      await supabase
        .from("members")
        .update({
          system_role: newRole,
          role_type: (newRole === "Admin" || newRole === "Manager") ? "manager" : "developer",
        })
        .eq("id", userId);
    } catch {}
  }

  return { success: true, updatedMember, payload };
}

/**
 * Allows a user to edit their basic profile details (name, role_title, department, bio, skills).
 */
export async function updateMemberBasicDetails(
  memberId: string,
  details: {
    name?: string;
    role_title?: string;
    department?: string;
    bio?: string;
    skills?: string[];
  },
  supabase?: SupabaseClient
): Promise<Member | null> {
  const members = await fetchWorkspaceMembers(supabase);
  let updatedMember: Member | null = null;

  const updated = members.map((m) => {
    if (m.id === memberId) {
      const up: Member = {
        ...m,
        name: details.name !== undefined ? details.name.trim() : m.name,
        role_title: details.role_title !== undefined ? details.role_title.trim() : m.role_title,
        department: details.department !== undefined ? details.department.trim() : m.department,
        bio: details.bio !== undefined ? details.bio.trim() : m.bio,
        skills: details.skills !== undefined ? details.skills : m.skills,
      };
      updatedMember = up;
      return up;
    }
    return m;
  });

  saveMembersLocal(updated);

  if (supabase && updatedMember) {
    try {
      await supabase
        .from("members")
        .update({
          name: (updatedMember as Member).name,
          role_title: (updatedMember as Member).role_title,
          department: (updatedMember as Member).department,
          bio: (updatedMember as Member).bio,
          skills: (updatedMember as Member).skills,
        })
        .eq("id", memberId);
    } catch {}
  }

  return updatedMember;
}

/**
 * Ensures the currently signed-in authenticated user appears in the members list immediately,
 * and synchronizes them to Supabase and localStorage.
 */
export function syncCurrentUserToMembers(
  authUser: { id?: string; email?: string; user_metadata?: { full_name?: string } } | null,
  currentMembers: Member[],
  supabase?: SupabaseClient
): { updatedList: Member[]; newlyAdded: Member | null } {
  if (!authUser || !authUser.email) {
    return { updatedList: currentMembers, newlyAdded: null };
  }

  const emailLower = authUser.email.toLowerCase().trim();
  const displayName =
    authUser.user_metadata?.full_name || authUser.email.split("@")[0] || "Workspace Member";
  const isDefaultAdminUser = isDefaultAdmin(displayName, emailLower);

  const existingIndex = currentMembers.findIndex(
    (m) => (m.email && m.email.toLowerCase().trim() === emailLower) || m.id === authUser.id
  );

  if (existingIndex >= 0) {
    const existing = currentMembers[existingIndex];
    let changed = false;
    const updated = [...currentMembers];
    // If user matches Rama Rao or prince, ensure Admin
    let currentRole: SystemRole = (existing.system_role as SystemRole) || "Developer";
    if (isDefaultAdminUser && currentRole !== "Admin") {
      currentRole = "Admin";
      changed = true;
    }
    if (existing.status !== "online") {
      changed = true;
    }

    if (changed) {
      updated[existingIndex] = {
        ...existing,
        status: "online",
        system_role: currentRole,
      };
      saveMembersLocal(updated);
      if (supabase) {
        supabase
          .from("members")
          .update({ status: "online", system_role: currentRole })
          .eq("id", existing.id)
          .then(() => {}, () => {});
      }
      return { updatedList: updated, newlyAdded: null };
    }
    return { updatedList: currentMembers, newlyAdded: null };
  }

  // Newly signed-in member
  const now = new Date().toISOString();
  const targetRole: SystemRole = isDefaultAdminUser ? "Admin" : "Developer";
  const newMember: Member = {
    id: authUser.id || `m-auth-${Date.now().toString(36)}`,
    name: displayName,
    email: authUser.email,
    role_type: targetRole === "Admin" ? "manager" : "developer",
    system_role: targetRole,
    role_title: targetRole === "Admin" ? "Workspace Administrator" : "Software Developer",
    department: targetRole === "Admin" ? "Executive & AI Strategy" : "AI Agent Development",
    avatar_color: "from-indigo-600 via-purple-600 to-pink-500",
    owl_avatar: (typeof window !== "undefined" && localStorage.getItem("user_owl_avatar")) || "avatar-1",
    status: "online",
    skills: ["AI Systems", "Next.js", "Collaboration"],
    assigned_projects: ["Financial Document Intelligence"],
    created_at: now,
    joined_date: now,
    bio: "Signed in via Cognitive Workspace auth session. Synchronized with live workspace members directory.",
    activity_log: [
      {
        id: `act-${Date.now().toString(36)}`,
        action: `User registered & signed in with ${targetRole} role`,
        timestamp: now,
        details: "Live authenticated session registered in workspace roster.",
      },
    ],
  };

  const updatedList = [newMember, ...currentMembers];
  saveMembersLocal(updatedList);

  if (supabase) {
    supabase
      .from("members")
      .upsert([
        {
          id: newMember.id,
          name: newMember.name,
          email: newMember.email,
          role_type: newMember.role_type,
          system_role: newMember.system_role,
          role_title: newMember.role_title,
          department: newMember.department,
          avatar_color: newMember.avatar_color,
          owl_avatar: newMember.owl_avatar,
          status: newMember.status,
          skills: newMember.skills,
          assigned_projects: newMember.assigned_projects,
          created_at: newMember.created_at,
        },
      ])
      .then(() => {}, () => {});
  }

  return { updatedList, newlyAdded: newMember };
}

/**
 * Updates a member's chosen owl avatar across local storage and Supabase if available.
 */
export async function updateMemberAvatar(
  memberId: string,
  newOwlAvatar: string,
  supabase?: SupabaseClient
): Promise<Member | null> {
  const members = await fetchWorkspaceMembers(supabase);
  let updatedMember: Member | null = null;
  const updated = members.map((m) => {
    if (m.id === memberId) {
      const up = { ...m, owl_avatar: newOwlAvatar };
      updatedMember = up;
      return up;
    }
    return m;
  });
  saveMembersLocal(updated);

  if (supabase) {
    try {
      await supabase.from("members").update({ owl_avatar: newOwlAvatar }).eq("id", memberId);
    } catch {}
  }
  return updatedMember;
}

/**
 * Generates and inserts a realistic new user sign-in for testing real-time synchronization.
 */
export function simulateNewUserSignIn(): Member {
  const sampleUsers = [
    {
      name: "Jordan Blake",
      email: "jordan.blake@cognitive.ai",
      role_title: "AI Security & Guardrails Engineer",
      role_type: "developer" as MemberRoleType,
      system_role: "Developer" as SystemRole,
      department: "SecOps & Guardrails",
      avatar_color: "from-rose-500 to-orange-500",
      skills: ["Red Teaming", "Llama Guard", "Prompt Defense"],
      bio: "Focuses on adversarial robustness, jailbreak defense, and automated compliance auditing.",
    },
    {
      name: "Kavita Patel",
      email: "kavita.patel@cognitive.ai",
      role_title: "Prompt Evaluation & Alignment Lead",
      role_type: "manager" as MemberRoleType,
      system_role: "Manager" as SystemRole,
      department: "Product Management",
      avatar_color: "from-amber-500 to-yellow-600",
      skills: ["Roadmap Planning", "Story Mapping", "KPI Benchmarks"],
      bio: "Aligns cognitive agents with regulatory compliance and cross-functional team milestones.",
    },
    {
      name: "Samir Khan",
      email: "samir.khan@cognitive.ai",
      role_title: "Compliance Auditor",
      role_type: "developer" as MemberRoleType,
      system_role: "Viewer" as SystemRole,
      department: "Legal & Regulatory",
      avatar_color: "from-zinc-500 to-zinc-700",
      skills: ["Audit Trails", "Evidence Review"],
      bio: "Read-only workspace compliance auditor reviewing evidence logs and story completion benchmarks.",
    },
  ];

  const template = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
  const uniqueId = `m-sim-${Date.now().toString(36)}-${Math.floor(Math.random() * 900 + 100)}`;
  const now = new Date().toISOString();
  const owlIdx = Math.floor(Math.random() * 12) + 1;

  return {
    id: uniqueId,
    name: template.name,
    email: template.email,
    role_type: template.role_type,
    system_role: template.system_role,
    role_title: template.role_title,
    department: template.department,
    avatar_color: template.avatar_color,
    owl_avatar: `avatar-${owlIdx}`,
    status: "online",
    skills: template.skills,
    assigned_projects: ["Financial Document Intelligence"],
    created_at: now,
    joined_date: now,
    bio: template.bio,
    activity_log: [
      {
        id: `act-${Date.now().toString(36)}`,
        action: `Signed in with ${template.system_role} role`,
        timestamp: now,
        details: "Instant profile provisioning and talent synchronization completed.",
      },
    ],
  };
}

export function getTasksLocal(): Task[] {
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

export function mapStageToStatus(stage?: TaskStage): "pending" | "in_progress" | "completed" {
  if (stage === "done") return "completed";
  if (stage === "in_progress" || stage === "review") return "in_progress";
  return "pending";
}

export function mapStatusToStage(status?: string): TaskStage {
  if (status === "completed") return "done";
  if (status === "in_progress") return "in_progress";
  if (status === "review") return "review";
  return "todo";
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function fetchWorkspaceTasks(
  supabase?: SupabaseClient
): Promise<Task[]> {
  // 1. Supabase Cloud Sync (Authoritative for all team members)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        const localCurrent = getTasksLocal();
        const localMap = new Map(localCurrent.map((t) => [t.id, t]));

        const mapped: Task[] = data.map((t: any) => {
          const localMatch = localMap.get(t.id);
          return {
            id: t.id,
            project_id: t.project_id,
            story_id: t.story_id || localMatch?.story_id || null,
            story_title: t.story_title || localMatch?.story_title || null,
            project_name: t.project_name || localMatch?.project_name || "Project",
            title: t.title,
            description: t.description ?? "",
            descriptive_paths: Array.isArray(t.descriptive_paths)
              ? t.descriptive_paths
              : localMatch?.descriptive_paths || [],
            priority: (t.priority || "medium") as TaskPriority,
            stage: (t.stage as TaskStage) || mapStatusToStage(t.status),
            assigned_to_id: t.assigned_to_id || localMatch?.assigned_to_id || null,
            assigned_to_name: t.assigned_to_name || localMatch?.assigned_to_name || null,
            assigned_to_role: t.assigned_to_role || localMatch?.assigned_to_role || null,
            due_date: t.due_date ? String(t.due_date).split("T")[0] : localMatch?.due_date || "",
            created_at: t.created_at || new Date().toISOString(),
            updated_at: t.updated_at || new Date().toISOString(),
            syncedToSupabase: true,
          };
        });

        // Save authoritative remote truth to local storage cache
        saveTasksLocal(mapped);
        return mapped;
      } else if (error) {
        console.warn("Supabase tasks fetch warning:", error.message);
      }
    } catch (err) {
      console.warn("Supabase tasks fetch failed:", err);
    }
  }

  // 2. Local Storage Fallback (only used when database is unreachable)
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

  // 3. Backend Store Fallback
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

  saveTasksLocal(DEFAULT_TASKS);
  return DEFAULT_TASKS;
}

export async function createWorkspaceTask(
  payload: Omit<Task, "id" | "created_at">,
  supabase?: SupabaseClient,
  userId?: string
): Promise<Task> {
  // Always generate a genuine RFC4122 v4 UUID so Postgres UUID/TEXT constraints never fail
  const generatedId = generateUUID();

  const newTask: Task = {
    ...payload,
    id: generatedId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    syncedToSupabase: false,
  };

  // Immediate optimistic local save
  const currentLocal = getTasksLocal();
  const updated = [newTask, ...currentLocal.filter((t) => t.id !== newTask.id)];
  saveTasksLocal(updated);

  // Supabase sync
  if (supabase) {
    try {
      // 1. Resolve current authenticated user if not explicitly passed
      if (!userId) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user?.id) {
            userId = authData.user.id;
          }
        } catch {
          // Unauthenticated
        }
      }

      // 2. If project is one of the initial seed projects, ensure parent project row exists in Supabase
      const isSeed = DEFAULT_PROJECTS.find((p) => p.id === newTask.project_id);
      if (isSeed) {
        try {
          await supabase.from("projects").upsert(
            {
              id: isSeed.id,
              name: isSeed.name,
              title: isSeed.name,
              description: isSeed.description,
              category: isSeed.category,
              tags: isSeed.tags,
              source_url: isSeed.source_url,
              documents_count: isSeed.documents_count,
              status: isSeed.status,
              created_at: isSeed.created_at,
            },
            { onConflict: "id" }
          );
        } catch {
          // Ignore upsert error
        }
      }

      // 3. Prepare core database payload (compatible with base tasks table)
      const corePayload: Record<string, any> = {
        id: newTask.id,
        project_id: newTask.project_id,
        story_id: newTask.story_id || null,
        title: newTask.title,
        description: newTask.description || "",
        status: mapStageToStatus(newTask.stage),
        priority: newTask.priority || "medium",
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
        created_at: newTask.created_at,
        updated_at: newTask.updated_at,
      };

      if (userId) {
        corePayload.user_id = userId;
      }

      // 4. Extended payload with story, stage, member, and path metadata
      const fullPayload: Record<string, any> = {
        ...corePayload,
        story_title: newTask.story_title || null,
        stage: newTask.stage,
        project_name: newTask.project_name,
        descriptive_paths: Array.isArray(newTask.descriptive_paths) ? newTask.descriptive_paths : [],
        assigned_to_id: newTask.assigned_to_id || null,
        assigned_to_name: newTask.assigned_to_name || null,
        assigned_to_role: newTask.assigned_to_role || null,
      };

      // Try full insert first; if database lacks extended columns (PGRST204), fallback to core columns
      let res = await supabase.from("tasks").insert([fullPayload]).select().single();
      if (res.error && res.error.code === "PGRST204") {
        res = await supabase.from("tasks").insert([corePayload]).select().single();
      }

      if (res.error) {
        console.error("Supabase createWorkspaceTask failed:", res.error);
        newTask.syncedToSupabase = false;
        newTask.syncError = res.error.message;
      } else {
        newTask.syncedToSupabase = true;
        // Update local storage entry to record synced status
        saveTasksLocal(
          getTasksLocal().map((t) => (t.id === newTask.id ? { ...t, syncedToSupabase: true } : t))
        );
      }
    } catch (err: any) {
      console.error("Supabase createWorkspaceTask exception:", err);
      newTask.syncedToSupabase = false;
      newTask.syncError = err?.message || "Network error";
    }
  }

  // Auto-sync parent story progress if this task belongs to a story
  if (newTask.story_id) {
    syncStoryProgressWithTasks(newTask.story_id, getTasksLocal(), supabase);
  }

  // Backend sync if online
  try {
    await fetch(`${API_URL}/api/v1/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    });
  } catch {
    // Offline
  }

  return newTask;
}

export async function updateWorkspaceTask(
  taskId: string,
  updates: Partial<Task>,
  supabase?: SupabaseClient
): Promise<Task[]> {
  const currentLocal = getTasksLocal();
  const nowIso = new Date().toISOString();

  const updatedTasks = currentLocal.map((t) =>
    t.id === taskId ? { ...t, ...updates, updated_at: nowIso } : t
  );

  saveTasksLocal(updatedTasks);

  // Supabase sync
  if (supabase) {
    try {
      const fullUpdates: Record<string, any> = {
        ...updates,
        updated_at: nowIso,
      };
      if (updates.story_id !== undefined) fullUpdates.story_id = updates.story_id;
      if (updates.story_title !== undefined) fullUpdates.story_title = updates.story_title;
      if (updates.stage) {
        fullUpdates.status = mapStageToStatus(updates.stage);
        fullUpdates.stage = updates.stage;
      }
      if (updates.due_date) {
        fullUpdates.due_date = new Date(updates.due_date).toISOString();
      }

      let res = await supabase.from("tasks").update(fullUpdates).eq("id", taskId);
      if (res.error && res.error.code === "PGRST204") {
        // Table doesn't have extended columns; retry with core columns only
        const coreUpdates: Record<string, any> = { updated_at: nowIso };
        if (updates.title !== undefined) coreUpdates.title = updates.title;
        if (updates.description !== undefined) coreUpdates.description = updates.description;
        if (updates.priority !== undefined) coreUpdates.priority = updates.priority;
        if (updates.stage !== undefined) coreUpdates.status = mapStageToStatus(updates.stage);
        if (updates.due_date !== undefined) coreUpdates.due_date = new Date(updates.due_date).toISOString();
        res = await supabase.from("tasks").update(coreUpdates).eq("id", taskId);
      }

      if (res.error) {
        console.error("Supabase updateWorkspaceTask failed:", res.error);
      }
    } catch (err) {
      console.error("Supabase updateWorkspaceTask exception:", err);
    }
  }

  // Auto-sync parent story progress if this task belongs to a story
  const currentTask = updatedTasks.find((t) => t.id === taskId);
  if (currentTask && currentTask.story_id) {
    syncStoryProgressWithTasks(currentTask.story_id, updatedTasks, supabase);
  }

  // Backend sync if online
  try {
    await fetch(`${API_URL}/api/v1/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  } catch {
    // Offline
  }

  return updatedTasks;
}

export async function deleteWorkspaceTask(
  taskId: string,
  supabase?: SupabaseClient
): Promise<Task[]> {
  const currentLocal = getTasksLocal();
  const targetTask = currentLocal.find((t) => t.id === taskId);
  const filtered = currentLocal.filter((t) => t.id !== taskId);
  saveTasksLocal(filtered);

  // Recalculate parent story progress
  if (targetTask && targetTask.story_id) {
    syncStoryProgressWithTasks(targetTask.story_id, filtered, supabase);
  }

  if (supabase) {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) {
        console.error("Supabase deleteWorkspaceTask failed:", error);
      }
    } catch (err) {
      console.error("Supabase deleteWorkspaceTask exception:", err);
    }
  }

  try {
    await fetch(`${API_URL}/api/v1/tasks/${taskId}`, { method: "DELETE" });
  } catch {
    // Offline
  }

  return filtered;
}

// ==============================================================================
// STORIES: STORAGE, PROGRESS ROLLUP & CASCADE OPERATIONS
// ==============================================================================

export function getStoriesLocal(): Story[] {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem(LS_STORIES_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Parse error
      }
    }
  }
  return DEFAULT_STORIES;
}

export function saveStoriesLocal(stories: Story[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LS_STORIES_KEY, JSON.stringify(stories));
    } catch {
      // Storage error
    }
  }
}

/**
 * Computes story progress percentage (0 - 100) based on child tasks.
 * done: 100%, review: 75%, in_progress: 40%, todo: 0%
 */
export function computeStoryProgress(storyId: string, allTasks?: Task[]): number {
  const tasks = allTasks || getTasksLocal();
  const childTasks = tasks.filter((t) => t.story_id === storyId);
  if (childTasks.length === 0) return 0;

  const totalScore = childTasks.reduce((acc, t) => {
    if (t.stage === "done") return acc + 100;
    if (t.stage === "review") return acc + 75;
    if (t.stage === "in_progress") return acc + 40;
    return acc;
  }, 0);

  return Math.round(totalScore / childTasks.length);
}

/**
 * Computes overarching project progress bar based on BOTH stories and tasks.
 */
export function computeProjectProgress(
  projectId: string,
  stories?: Story[],
  tasks?: Task[]
): {
  progress: number;
  totalStories: number;
  completedStories: number;
  totalTasks: number;
  doneTasks: number;
} {
  const currentStories = (stories || getStoriesLocal()).filter((s) => s.project_id === projectId);
  const currentTasks = (tasks || getTasksLocal()).filter((t) => t.project_id === projectId);

  const doneTasks = currentTasks.filter((t) => t.stage === "done").length;
  const totalTasks = currentTasks.length;
  const totalStories = currentStories.length;
  const completedStories = currentStories.filter((s) => s.progress === 100 || s.status === "completed").length;

  if (totalStories === 0 && totalTasks === 0) {
    return { progress: 0, totalStories: 0, completedStories: 0, totalTasks: 0, doneTasks: 0 };
  }

  let progress = 0;
  if (totalStories > 0 && totalTasks > 0) {
    const avgStoryProgress = currentStories.reduce((acc, s) => acc + (s.progress || 0), 0) / totalStories;
    const taskDoneRatio = (doneTasks / totalTasks) * 100;
    // 60% weight to stories milestone, 40% weight to direct task completion
    progress = Math.round(avgStoryProgress * 0.6 + taskDoneRatio * 0.4);
  } else if (totalStories > 0) {
    progress = Math.round(currentStories.reduce((acc, s) => acc + (s.progress || 0), 0) / totalStories);
  } else {
    progress = Math.round((doneTasks / totalTasks) * 100);
  }

  return {
    progress: Math.min(100, Math.max(0, progress)),
    totalStories,
    completedStories,
    totalTasks,
    doneTasks,
  };
}

/**
 * Synchronizes story progress based on its child tasks and persists the update.
 */
export function syncStoryProgressWithTasks(
  storyId: string,
  currentTasks: Task[],
  supabase?: SupabaseClient
): Story[] {
  const stories = getStoriesLocal();
  const newProgress = computeStoryProgress(storyId, currentTasks);
  const newStatus: StoryStatus =
    newProgress === 100 ? "completed" : newProgress > 0 ? "in_progress" : "open";
  const nowIso = new Date().toISOString();

  const updatedStories = stories.map((s) => {
    if (s.id === storyId) {
      return {
        ...s,
        progress: newProgress,
        status: newStatus,
        updated_at: nowIso,
      };
    }
    return s;
  });

  saveStoriesLocal(updatedStories);

  if (supabase) {
    supabase
      .from("stories")
      .update({ progress: newProgress, status: newStatus, updated_at: nowIso })
      .eq("id", storyId)
      .then(
        () => {},
        () => {}
      );
  }

  return updatedStories;
}

export async function fetchWorkspaceStories(
  supabase?: SupabaseClient,
  projectId?: string
): Promise<Story[]> {
  let stories = getStoriesLocal();

  if (supabase) {
    try {
      let query = supabase.from("stories").select("*").order("created_at", { ascending: false });
      if (projectId) query = query.eq("project_id", projectId);
      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        stories = data;
        saveStoriesLocal(stories);
      }
    } catch {
      // Offline or table not migrated
    }
  }

  // Ensure progress reflects live tasks
  const tasks = getTasksLocal();
  stories = stories.map((s) => ({
    ...s,
    progress: computeStoryProgress(s.id, tasks),
  }));

  if (projectId) {
    return stories.filter((s) => s.project_id === projectId);
  }
  return stories;
}

export async function createWorkspaceStory(
  storyData: Omit<Story, "id" | "created_at" | "progress">,
  supabase?: SupabaseClient
): Promise<Story> {
  const newStory: Story = {
    ...storyData,
    id: `story-${Date.now().toString(36)}`,
    progress: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = getStoriesLocal();
  const updated = [newStory, ...current];
  saveStoriesLocal(updated);

  if (supabase) {
    try {
      await supabase.from("stories").insert([newStory]);
    } catch (err) {
      console.warn("Supabase createWorkspaceStory error:", err);
    }
  }

  return newStory;
}

/**
 * Updates a story. If globally changing due_date or priority, cascade to all tasks under this story.
 */
export async function updateWorkspaceStory(
  storyId: string,
  updates: Partial<Story>,
  cascadeToTasks: boolean = true,
  supabase?: SupabaseClient
): Promise<{ stories: Story[]; tasks: Task[] }> {
  const stories = getStoriesLocal();
  const tasks = getTasksLocal();
  const nowIso = new Date().toISOString();

  // 1. Update the story
  const updatedStories = stories.map((s) =>
    s.id === storyId ? { ...s, ...updates, updated_at: nowIso } : s
  );
  saveStoriesLocal(updatedStories);

  // 2. Cascade global Due Date & Priority to all child tasks if requested
  let updatedTasks = tasks;
  if (cascadeToTasks && (updates.due_date !== undefined || updates.priority !== undefined)) {
    updatedTasks = tasks.map((t) => {
      if (t.story_id === storyId) {
        return {
          ...t,
          ...(updates.due_date ? { due_date: updates.due_date } : {}),
          ...(updates.priority ? { priority: updates.priority as TaskPriority } : {}),
          updated_at: nowIso,
        };
      }
      return t;
    });
    saveTasksLocal(updatedTasks);
  }

  // 3. Supabase dispatch
  if (supabase) {
    try {
      await supabase.from("stories").update({ ...updates, updated_at: nowIso }).eq("id", storyId);
      if (cascadeToTasks && (updates.due_date || updates.priority)) {
        const taskUpdates: Record<string, any> = { updated_at: nowIso };
        if (updates.due_date) taskUpdates.due_date = new Date(updates.due_date).toISOString();
        if (updates.priority) taskUpdates.priority = updates.priority;
        await supabase.from("tasks").update(taskUpdates).eq("story_id", storyId);
      }
    } catch (err) {
      console.warn("Supabase updateWorkspaceStory error:", err);
    }
  }

  return { stories: updatedStories, tasks: updatedTasks };
}

export async function deleteWorkspaceStory(
  storyId: string,
  supabase?: SupabaseClient
): Promise<{ stories: Story[]; tasks: Task[] }> {
  const stories = getStoriesLocal().filter((s) => s.id !== storyId);
  saveStoriesLocal(stories);

  // Detach child tasks
  const tasks = getTasksLocal().map((t) =>
    t.story_id === storyId ? { ...t, story_id: null, story_title: null } : t
  );
  saveTasksLocal(tasks);

  if (supabase) {
    try {
      await supabase.from("stories").delete().eq("id", storyId);
    } catch {
      // Ignored
    }
  }

  return { stories, tasks };
}

// ==============================================================================
// TYPED SUPABASE DATABASE TYPES & CRUD SERVICES
// ==============================================================================

export type {
  Database,
  ProjectRow,
  ProjectInsert,
  ProjectUpdate,
  TaskRow,
  TaskInsert,
  TaskUpdate,
  ProjectStatus,
} from "../types/supabase";

export {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from "../lib/services/projectTaskService";
