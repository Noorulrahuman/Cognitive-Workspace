"use client";

import { use, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Task,
  TaskStage,
  TaskPriority,
  Member,
  STAGE_CONFIG,
  PRIORITY_CONFIG,
  fetchWorkspaceTasks,
  createWorkspaceTask,
  updateWorkspaceTask,
  deleteWorkspaceTask,
  fetchWorkspaceMembers,
} from "@/utils/workspaceData";

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

function formatDate(iso: string): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(iso: string, stage: TaskStage): boolean {
  if (!iso || stage === "done") return false;
  const due = new Date(iso);
  const now = new Date();
  return due.getTime() < now.getTime() - 24 * 60 * 60 * 1000;
}

function parsePathsString(str: string): string[] {
  return str
    .split(/[\n,]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function ProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = decodeURIComponent(resolvedParams.id);
  const supabase = createClient();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters within this project
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("All");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("All");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [isEditingTaskInfo, setIsEditingTaskInfo] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editPathsText, setEditPathsText] = useState<string>("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("medium");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const openTaskDetail = (task: Task) => {
    setTaskDetail(task);
    setIsEditingTaskInfo(false);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPathsText((task.descriptive_paths || []).join("\n"));
    setEditPriority(task.priority);
  };

  // Form State with Description Box & Descriptive Paths Box
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    descriptive_paths_text: "",
    assigned_to_id: "",
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    priority: "medium" as TaskPriority,
    stage: "todo" as TaskStage,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load project details and project tasks
  const loadProjectAndTasks = useCallback(async () => {
    setLoading(true);

    // 1. Find Project
    let foundProj: Project | null = null;
    try {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .or(`id.eq.${projectId},name.eq.${projectId}`)
        .single();
      if (data) foundProj = data;
    } catch {
      // Supabase error
    }

    if (!foundProj && typeof window !== "undefined") {
      const local = localStorage.getItem("cognitive_projects");
      if (local) {
        try {
          const parsed: Project[] = JSON.parse(local);
          foundProj = parsed.find((p) => p.id === projectId || p.name === projectId) || null;
        } catch {
          // Parse error
        }
      }
    }

    if (!foundProj) {
      foundProj = DEFAULT_PROJECTS.find((p) => p.id === projectId || p.name === projectId) || null;
    }

    setProject(foundProj);

    // 2. Load Tasks and Members
    const [allTasks, allMembers] = await Promise.all([
      fetchWorkspaceTasks(supabase),
      fetchWorkspaceMembers(supabase),
    ]);

    setMembers(allMembers);

    // Filter tasks strictly belonging to this project
    if (foundProj) {
      const projTasks = allTasks.filter(
        (t) => t.project_id === foundProj!.id || t.project_name === foundProj!.name
      );
      setTasks(projTasks);
    }

    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    loadProjectAndTasks();
  }, [loadProjectAndTasks]);

  // Esc key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddModalOpen(false);
        setTaskDetail(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered tasks for this project
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesStage = selectedStageFilter === "All" || t.stage === selectedStageFilter;
      const matchesPriority = selectedPriorityFilter === "All" || t.priority === selectedPriorityFilter;
      const matchesAssignee =
        selectedAssigneeFilter === "All" ||
        t.assigned_to_id === selectedAssigneeFilter ||
        t.assigned_to_name === selectedAssigneeFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q)) ||
        (t.descriptive_paths && t.descriptive_paths.some((p) => p.toLowerCase().includes(q)));

      return matchesStage && matchesPriority && matchesAssignee && matchesQuery;
    });
  }, [tasks, selectedStageFilter, selectedPriorityFilter, selectedAssigneeFilter, searchQuery]);

  // Handle stage change
  const handleStageChange = async (taskId: string, newStage: TaskStage) => {
    const updated = await updateWorkspaceTask(taskId, { stage: newStage }, supabase);
    if (project) {
      setTasks(
        updated.filter((t) => t.project_id === project.id || t.project_name === project.name)
      );
    }
    showToast(`Task moved to ${STAGE_CONFIG[newStage].label}.`);
    if (taskDetail && taskDetail.id === taskId) {
      setTaskDetail({ ...taskDetail, stage: newStage });
    }
  };

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !taskForm.title.trim()) return;

    setSubmitting(true);
    const assignedMember = members.find((m) => m.id === taskForm.assigned_to_id);
    const parsedPaths = parsePathsString(taskForm.descriptive_paths_text);

    const newTask = await createWorkspaceTask(
      {
        project_id: project.id,
        project_name: project.name,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || "No additional description.",
        descriptive_paths: parsedPaths,
        priority: taskForm.priority,
        stage: taskForm.stage,
        assigned_to_id: assignedMember ? assignedMember.id : null,
        assigned_to_name: assignedMember ? assignedMember.name : "Unassigned",
        assigned_to_role: assignedMember ? assignedMember.role_title : null,
        due_date: taskForm.due_date,
      },
      supabase
    );

    setTasks((prev) => [newTask, ...prev]);
    setIsAddModalOpen(false);
    setTaskForm({
      title: "",
      description: "",
      descriptive_paths_text: "",
      assigned_to_id: "",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      priority: "medium",
      stage: "todo",
    });
    setSubmitting(false);
    showToast(`Task "${newTask.title}" added to project.`);
  };

  // Handle Update Task in Details Modal
  const handleUpdateTaskDetail = async (updates: Partial<Task>) => {
    if (!taskDetail || !project) return;
    const updatedAll = await updateWorkspaceTask(taskDetail.id, updates, supabase);
    setTasks(
      updatedAll.filter((t) => t.project_id === project.id || t.project_name === project.name)
    );
    setTaskDetail({ ...taskDetail, ...updates });
    showToast("Task updated.");
  };

  // Handle Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!project) return;
    const updatedAll = await deleteWorkspaceTask(taskId, supabase);
    setTasks(
      updatedAll.filter((t) => t.project_id === project.id || t.project_name === project.name)
    );
    setTaskDetail(null);
    showToast("Task deleted.");
  };

  const STAGES: TaskStage[] = ["todo", "in_progress", "review", "done"];

  // NEW: numbers used by the progress bar.
  // "tasks" holds only the tasks of THIS project, so no extra filtering is needed.
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.stage === "done").length;
  // 0 tasks -> 0% (avoids dividing by zero), otherwise rounded percentage
  const progressPercent =
    totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  // NEW: the people working on this project.
  // A member counts when the project is in their "assigned_projects" list,
  // or when a task of this project is assigned to them.
  const projectTeam = members.filter(
    (m) =>
      m.assigned_projects?.includes(project?.name ?? "") ||
      tasks.some((t) => t.assigned_to_id === m.id)
  );

  if (!loading && !project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-bold text-white">Project Not Found</h2>
        <p className="mt-2 text-xs text-zinc-400">The requested project ID or name does not exist.</p>
        <Link
          href="/projects"
          className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white"
        >
          &larr; Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-zinc-900/95 px-4 py-3 text-xs font-semibold text-indigo-300 shadow-2xl backdrop-blur-md animate-scale-up">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back to Projects Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition"
        >
          <span>&larr; Back to All Projects</span>
        </Link>
      </div>

      {/* Project Banner & Details Header */}
      {project && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-md mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
            <div className="flex items-start gap-4">
              <div
                className={`h-12 w-12 rounded-xl bg-linear-to-br ${getProjectColor(
                  project.name
                )} flex items-center justify-center text-lg font-bold text-white shadow-md shrink-0`}
              >
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {project.name}
                  </h1>
                  <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-mono text-indigo-300">
                    {project.category}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {project.status}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
                  {project.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href={`/chat?project=${encodeURIComponent(project.name)}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/50 text-xs font-semibold text-indigo-200 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Launch Gemini</span>
              </Link>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Task</span>
              </button>
            </div>
          </div>
          {/* NEW: Progress bar. Shows how much of this project is finished. */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Progress</span>
              {/* Text on the right, e.g. "6 of 10 tasks done (60%)" */}
              <span className={progressPercent === 100 ? "text-emerald-400 font-semibold" : "text-zinc-300"}>
                {totalTasks === 0
                  ? "No tasks yet"
                  : `${doneTasks} of ${totalTasks} tasks done (${progressPercent}%)`}
              </span>
            </div>
            {/* Grey track. role="progressbar" lets screen readers announce the value. */}
            <div
              role="progressbar"
              aria-label="Project progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800"
            >
              {/* Colored fill. Width = progress %. Green when everything is done. */}
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercent === 100
                    ? "bg-emerald-400"
                    : "bg-linear-to-r from-indigo-500 to-sky-400"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* NEW: team of this project (avatars; hover to read the name) */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400">Team</span>
            {projectTeam.length === 0 ? (
              <span className="text-xs font-mono text-zinc-600">No team members yet</span>
            ) : (
              <>
                <div className="flex -space-x-2">
                  {projectTeam.slice(0, 6).map((m) => (
                    <div
                      key={m.id}
                      title={`${m.name} (${m.role_title})`}
                      className={`h-7 w-7 rounded-full bg-linear-to-tr ${m.avatar_color} ring-2 ring-zinc-900 flex items-center justify-center text-[10px] font-bold text-white`}
                    >
                      {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                  ))}
                  {projectTeam.length > 6 && (
                    <div className="h-7 w-7 rounded-full bg-zinc-800 ring-2 ring-zinc-900 flex items-center justify-center text-[10px] font-mono text-zinc-300">
                      +{projectTeam.length - 6}
                    </div>
                  )}
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  {projectTeam.length} {projectTeam.length === 1 ? "member" : "members"}
                </span>
              </>
            )}
          </div>

          

          {/* Project Sub-stats */}
          <div className="mt-4 flex flex-wrap items-center gap-6 text-xs font-mono text-zinc-400">
            <div>
              <span className="text-zinc-500">Total Project Tasks:</span>{" "}
              <strong className="text-white font-bold">{tasks.length}</strong>
            </div>
            <div>
              <span className="text-zinc-500">In Progress:</span>{" "}
              <strong className="text-sky-300 font-bold">
                {tasks.filter((t) => t.stage === "in_progress").length}
              </strong>
            </div>
            <div>
              <span className="text-zinc-500">In Review:</span>{" "}
              <strong className="text-amber-300 font-bold">
                {tasks.filter((t) => t.stage === "review").length}
              </strong>
            </div>
            <div>
              <span className="text-zinc-500">Completed:</span>{" "}
              <strong className="text-emerald-300 font-bold">
                {tasks.filter((t) => t.stage === "done").length}
              </strong>
            </div>
            <div>
              <span className="text-zinc-500">Documents:</span>{" "}
              <strong className="text-zinc-200">{project.documents_count} indexed</strong>
            </div>
          </div>
        </div>
      )}

      {/* Task Filters & View Toggle */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Stage Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-zinc-500 font-mono text-[10px]">Stage:</span>
            <select
              value={selectedStageFilter}
              onChange={(e) => setSelectedStageFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-zinc-900">All Stages ({tasks.length})</option>
              <option value="todo" className="bg-zinc-900">To Do</option>
              <option value="in_progress" className="bg-zinc-900">In Progress</option>
              <option value="review" className="bg-zinc-900">In Review</option>
              <option value="done" className="bg-zinc-900">Completed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-zinc-500 font-mono text-[10px]">Priority:</span>
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-zinc-900">All Priorities</option>
              <option value="urgent" className="bg-zinc-900 text-rose-300">Urgent</option>
              <option value="high" className="bg-zinc-900 text-amber-300">High</option>
              <option value="medium" className="bg-zinc-900 text-blue-300">Medium</option>
              <option value="low" className="bg-zinc-900 text-zinc-300">Low</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-zinc-500 font-mono text-[10px]">Assignee:</span>
            <select
              value={selectedAssigneeFilter}
              onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="All" className="bg-zinc-900">All Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.name} className="bg-zinc-900 text-white">
                  {m.name} ({m.role_type === "manager" ? "Manager" : "Developer"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search within Project Tasks */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search tasks, descriptive paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 pl-8 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
            <svg
              className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900 p-0.5 text-xs">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                viewMode === "kanban"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                viewMode === "list"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="mt-3 text-xs font-mono">Loading project tasks...</p>
        </div>
      ) : (
        <div>
          {/* ============================================================ */}
          {/* KANBAN BOARD VIEW (SPECIFIC TO THIS PROJECT) */}
          {/* ============================================================ */}
          {viewMode === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {STAGES.map((stageKey) => {
                const stageTasks = filteredTasks.filter((t) => t.stage === stageKey);
                const stageConf = STAGE_CONFIG[stageKey];

                return (
                  <div
                    key={stageKey}
                    className="flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 min-h-[500px]"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${stageConf.dot}`} />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                          {stageConf.label}
                        </h2>
                      </div>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                        {stageTasks.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-3 flex-1">
                      {stageTasks.length === 0 ? (
                        <div className="h-32 flex items-center justify-center rounded-xl border border-dashed border-zinc-800/80 text-center text-xs text-zinc-600">
                          No tasks in this stage
                        </div>
                      ) : (
                        stageTasks.map((task) => {
                          const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                          const overdue = isOverdue(task.due_date, task.stage);

                          return (
                            <div
                              key={task.id}
                              onClick={() => openTaskDetail(task)}
                              className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/90 hover:border-indigo-500/50 hover:bg-zinc-850 p-4 shadow-md transition-all cursor-pointer space-y-2.5"
                            >
                              {/* Priority & Due */}
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-medium flex items-center gap-1 ${priorityConf.badge}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${priorityConf.dot}`} />
                                  <span>{priorityConf.label}</span>
                                </span>

                                <span className={`text-[10px] font-mono ${overdue ? "text-rose-400 font-bold" : "text-zinc-400"}`}>
                                  Due: {formatDate(task.due_date)}
                                </span>
                              </div>

                              {/* Title & Description */}
                              <div>
                                <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                                  {task.title}
                                </h3>
                                <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              </div>

                              {/* DESCRIPTIVE PATHS BOX (Highlighted for this task) */}
                              {task.descriptive_paths && task.descriptive_paths.length > 0 && (
                                <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
                                  <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                    <span>Descriptive Paths ({task.descriptive_paths.length}):</span>
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {task.descriptive_paths.slice(0, 2).map((path) => (
                                      <span
                                        key={path}
                                        className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-emerald-400/90 truncate max-w-[180px]"
                                        title={path}
                                      >
                                        {path}
                                      </span>
                                    ))}
                                    {task.descriptive_paths.length > 2 && (
                                      <span className="font-mono text-[9px] text-zinc-500">
                                        +{task.descriptive_paths.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Bottom: Assignee + Stage Advance */}
                              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="h-6 w-6 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0">
                                    {task.assigned_to_name
                                      ? task.assigned_to_name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .slice(0, 2)
                                      : "U"}
                                  </div>
                                  <span className="text-[11px] text-zinc-300 font-medium truncate max-w-[100px]">
                                    {task.assigned_to_name || "Unassigned"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  {stageKey !== "todo" && (
                                    <button
                                      onClick={() => {
                                        const prevIdx = STAGES.indexOf(stageKey) - 1;
                                        if (prevIdx >= 0) handleStageChange(task.id, STAGES[prevIdx]);
                                      }}
                                      title="Move to previous stage"
                                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer text-[10px]"
                                    >
                                      &larr;
                                    </button>
                                  )}
                                  {stageKey !== "done" && (
                                    <button
                                      onClick={() => {
                                        const nextIdx = STAGES.indexOf(stageKey) + 1;
                                        if (nextIdx < STAGES.length) handleStageChange(task.id, STAGES[nextIdx]);
                                      }}
                                      title="Advance to next stage"
                                      className="p-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition cursor-pointer text-[10px] font-bold px-1.5"
                                    >
                                      &rarr;
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ============================================================ */}
          {/* LIST VIEW (SPECIFIC TO THIS PROJECT) */}
          {/* ============================================================ */}
          {viewMode === "list" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Task Title</th>
                      <th className="py-3 px-4">Stage</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Descriptive Paths</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                          No tasks match current filter in this project.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => {
                        const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                        const stageConf = STAGE_CONFIG[task.stage];

                        return (
                          <tr
                            key={task.id}
                            onClick={() => openTaskDetail(task)}
                            className="hover:bg-zinc-850/60 transition cursor-pointer"
                          >
                            <td className="py-3.5 px-4 font-semibold text-white max-w-xs truncate">
                              {task.title}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono ${stageConf.badge}`}>
                                {stageConf.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono ${priorityConf.badge}`}>
                                {priorityConf.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-zinc-300 font-medium truncate">
                                {task.assigned_to_name || "Unassigned"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[10px] text-emerald-400/90 max-w-xs truncate">
                              {task.descriptive_paths?.join(", ") || "—"}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                              {formatDate(task.due_date)}
                            </td>
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openTaskDetail(task)}
                                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: ADD TASK TO THIS PROJECT */}
      {/* ============================================================ */}
      {isAddModalOpen && project && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add Task to Project"
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Add Task to {project.name}</h2>
                  <p className="text-[11px] text-zinc-400">Define milestone, member assignment, and descriptive paths.</p>
                </div>
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

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ingest and normalize SEC 10-K disclosures"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Assignee (Managers & Developers) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Assign to Member
                </label>
                <select
                  value={taskForm.assigned_to_id}
                  onChange={(e) => setTaskForm({ ...taskForm, assigned_to_id: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">Unassigned (Open Pool)</option>
                  <optgroup label="👑 Managers & Technical Leadership">
                    {members
                      .filter((m) => m.role_type === "manager")
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.role_title}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="⚡ Developers & Engineering Specialists">
                    {members
                      .filter((m) => m.role_type === "developer")
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.role_title}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Due Date & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Priority *
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Stage Where It's Now */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Current Stage *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTaskForm({ ...taskForm, stage: s })}
                      className={`py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                        taskForm.stage === s
                          ? "border-indigo-500 bg-indigo-500/20 text-white ring-1 ring-indigo-500/30"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {STAGE_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* DESCRIPTION BOX */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description Box
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe task scope, requirements, or acceptance criteria..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* DESCRIPTIVE PATHS BOX (List descriptive paths for the task) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                  <span>Descriptive Paths Box</span>
                  <span className="text-[10px] font-mono text-zinc-500">File paths, API routes, or spec paths</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter descriptive paths (one per line or comma-separated)&#10;e.g.&#10;rag-pipeline/extraction/pdf_tables.py&#10;backend/app/api/parsers/sec_10k.py&#10;docs/specs/10k_table_schema.json"
                  value={taskForm.descriptive_paths_text}
                  onChange={(e) => setTaskForm({ ...taskForm, descriptive_paths_text: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-emerald-400/90 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
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
                    <span>Add Task to Project</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: EDIT & DETAIL MODAL (ON CLICKING A TASK) */}
      {/* ============================================================ */}
      {taskDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setTaskDetail(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${taskDetail.title} details`}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Badges */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono ${STAGE_CONFIG[taskDetail.stage].badge}`}>
                  Stage: {STAGE_CONFIG[taskDetail.stage].label}
                </span>
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono ${PRIORITY_CONFIG[taskDetail.priority]?.badge}`}>
                  {PRIORITY_CONFIG[taskDetail.priority]?.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingTaskInfo && (
                  <button
                    onClick={() => setIsEditingTaskInfo(true)}
                    className="px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Details</span>
                  </button>
                )}
                <button onClick={() => setTaskDetail(null)} className="text-zinc-400 hover:text-zinc-200 cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* EDIT MODE */}
            {isEditingTaskInfo ? (
              <div className="space-y-4 rounded-xl border border-indigo-500/30 bg-zinc-950/60 p-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* DESCRIPTION BOX (EDITABLE) */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Description Box
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe task scope, requirements, or acceptance criteria..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* DESCRIPTIVE PATHS BOX (EDITABLE) */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                    <span>Descriptive Paths Box</span>
                    <span className="text-[10px] font-mono text-zinc-500">One per line or comma-separated</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="rag-pipeline/extraction/pdf_tables.py&#10;backend/app/api/parsers/sec_10k.py"
                    value={editPathsText}
                    onChange={(e) => setEditPathsText(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-emerald-400/90 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingTaskInfo(false)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const parsedPaths = parsePathsString(editPathsText);
                      await handleUpdateTaskDetail({
                        title: editTitle.trim() || taskDetail.title,
                        description: editDescription.trim(),
                        descriptive_paths: parsedPaths,
                        priority: editPriority,
                      });
                      setIsEditingTaskInfo(false);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-base font-bold text-white">{taskDetail.title}</h2>
                  <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {taskDetail.description || "No description provided."}
                  </p>
                </div>

                {/* Descriptive Paths Box */}
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      Descriptive Paths & Target Specifications
                    </p>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {taskDetail.descriptive_paths?.length || 0} paths listed
                    </span>
                  </div>
                  {taskDetail.descriptive_paths && taskDetail.descriptive_paths.length > 0 ? (
                    <div className="space-y-1">
                      {taskDetail.descriptive_paths.map((path, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-1.5 rounded-md bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-emerald-400/90"
                        >
                          <span className="text-zinc-600 select-none">#</span>
                          <span className="truncate">{path}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">No descriptive paths specified.</p>
                  )}
                </div>
              </>
            )}

            {/* Reassign Member & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                  Assigned Member
                </p>
                <select
                  value={taskDetail.assigned_to_id || ""}
                  onChange={(e) => {
                    const m = members.find((x) => x.id === e.target.value);
                    handleUpdateTaskDetail({
                      assigned_to_id: m ? m.id : null,
                      assigned_to_name: m ? m.name : "Unassigned",
                      assigned_to_role: m ? m.role_title : null,
                    });
                  }}
                  className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer truncate"
                >
                  <option value="" className="bg-zinc-900">Unassigned</option>
                  <optgroup label="👑 Managers & Leads" className="bg-zinc-900">
                    {members
                      .filter((m) => m.role_type === "manager")
                      .map((m) => (
                        <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                          {m.name} (Manager)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="⚡ Developers & Engineers" className="bg-zinc-900">
                    {members
                      .filter((m) => m.role_type === "developer")
                      .map((m) => (
                        <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                          {m.name} (Developer)
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                  Due Date
                </p>
                <input
                  type="date"
                  value={taskDetail.due_date}
                  onChange={(e) => handleUpdateTaskDetail({ due_date: e.target.value })}
                  className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => handleDeleteTask(taskDetail.id)}
                className="px-3 py-1.5 rounded-lg border border-rose-900/40 bg-rose-950/20 text-rose-300 text-xs font-semibold hover:bg-rose-900/40 cursor-pointer"
              >
                Delete Task
              </button>
              <button
                onClick={() => setTaskDetail(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
