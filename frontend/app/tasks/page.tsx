"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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

interface ProjectOption {
  id: string;
  name: string;
}

const DEFAULT_PROJECT_OPTIONS: ProjectOption[] = [
  { id: "d1a1b1c1-1111-4000-8000-000000000001", name: "Financial Document Intelligence" },
  { id: "d2a2b2c2-2222-4000-8000-000000000002", name: "Biomedical Literature Search" },
  { id: "d3a3b3c3-3333-4000-8000-000000000003", name: "Regulatory Web Scraper" },
];

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

function TasksContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const paramProject = searchParams.get("project");
  const paramAssignee = searchParams.get("assignee");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projectsList, setProjectsList] = useState<ProjectOption[]>(DEFAULT_PROJECT_OPTIONS);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>(paramProject || "All");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>(paramAssignee || "All");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Task Form
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    project_name: DEFAULT_PROJECT_OPTIONS[0].name,
    assigned_to_id: "",
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    priority: "medium" as TaskPriority,
    stage: "todo" as TaskStage,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [fetchedTasks, fetchedMembers] = await Promise.all([
      fetchWorkspaceTasks(supabase),
      fetchWorkspaceMembers(supabase),
    ]);
    setTasks(fetchedTasks);
    setMembers(fetchedMembers);

    // Also load projects list
    try {
      const { data } = await supabase.from("projects").select("id, name");
      if (data && data.length > 0) {
        setProjectsList(data);
      } else if (typeof window !== "undefined") {
        const local = localStorage.getItem("cognitive_projects");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjectsList(parsed.map((p) => ({ id: p.id, name: p.name })));
          }
        }
      }
    } catch {
      // Fallback defaults
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Sync search param changes
  useEffect(() => {
    if (paramProject) setSelectedProjectFilter(paramProject);
    if (paramAssignee) setSelectedAssigneeFilter(paramAssignee);
  }, [paramProject, paramAssignee]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesProj =
        selectedProjectFilter === "All" ||
        t.project_name === selectedProjectFilter ||
        t.project_id === selectedProjectFilter;

      const matchesAssignee =
        selectedAssigneeFilter === "All" ||
        t.assigned_to_name === selectedAssigneeFilter ||
        t.assigned_to_id === selectedAssigneeFilter;

      const matchesPriority =
        selectedPriorityFilter === "All" || t.priority === selectedPriorityFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.project_name.toLowerCase().includes(q) ||
        (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q));

      return matchesProj && matchesAssignee && matchesPriority && matchesQuery;
    });
  }, [tasks, selectedProjectFilter, selectedAssigneeFilter, selectedPriorityFilter, searchQuery]);

  // Handle stage change (1-click or move)
  const handleStageChange = async (taskId: string, newStage: TaskStage) => {
    const updated = await updateWorkspaceTask(taskId, { stage: newStage }, supabase);
    setTasks(updated);
    showToast(`Task moved to ${STAGE_CONFIG[newStage].label}.`);
    if (taskDetail && taskDetail.id === taskId) {
      setTaskDetail({ ...taskDetail, stage: newStage });
    }
  };

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    setSubmitting(true);
    const assignedMember = members.find((m) => m.id === taskForm.assigned_to_id);
    const matchedProject = projectsList.find((p) => p.name === taskForm.project_name);

    const created = await createWorkspaceTask(
      {
        project_id: matchedProject ? matchedProject.id : "default-proj",
        project_name: taskForm.project_name,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || "No additional task description.",
        priority: taskForm.priority,
        stage: taskForm.stage,
        assigned_to_id: assignedMember ? assignedMember.id : null,
        assigned_to_name: assignedMember ? assignedMember.name : "Unassigned",
        assigned_to_role: assignedMember ? assignedMember.role_title : null,
        due_date: taskForm.due_date,
      },
      supabase
    );

    setTasks((prev) => [created, ...prev]);
    setIsAddModalOpen(false);
    setTaskForm({
      title: "",
      description: "",
      project_name: projectsList[0]?.name || "Financial Document Intelligence",
      assigned_to_id: "",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      priority: "medium",
      stage: "todo",
    });
    setSubmitting(false);
    showToast(`Task "${created.title}" created successfully.`);
  };

  // Handle Update Task in Details Modal
  const handleUpdateTaskDetail = async (updates: Partial<Task>) => {
    if (!taskDetail) return;
    const updatedList = await updateWorkspaceTask(taskDetail.id, updates, supabase);
    setTasks(updatedList);
    setTaskDetail({ ...taskDetail, ...updates });
    showToast("Task updated.");
  };

  // Handle Delete Task
  const handleDeleteTask = async (taskId: string) => {
    const updated = await deleteWorkspaceTask(taskId, supabase);
    setTasks(updated);
    setTaskDetail(null);
    showToast("Task removed from board.");
  };

  const STAGES: TaskStage[] = ["todo", "in_progress", "review", "done"];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-zinc-900/95 px-4 py-3 text-xs font-semibold text-indigo-300 shadow-2xl backdrop-blur-md animate-scale-up">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-0.5 text-xs font-mono font-medium text-sky-300 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Workspace Task Orchestration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tasks & Workflow Stages
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Track stage progression, assign members, escalate priority, and manage milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/members"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Team Members</span>
          </Link>

          <button
            onClick={() => {
              if (selectedProjectFilter !== "All") {
                setTaskForm((prev) => ({ ...prev, project_name: selectedProjectFilter }));
              }
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter and View Bar */}
      <div className="mt-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project Dropdown */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-zinc-500 font-mono text-[10px]">Project:</span>
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer max-w-[170px] truncate"
            >
              <option value="All" className="bg-zinc-900 text-white">All Projects ({tasks.length})</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.name} className="bg-zinc-900 text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Dropdown */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-zinc-500 font-mono text-[10px]">Assignee:</span>
            <select
              value={selectedAssigneeFilter}
              onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="All" className="bg-zinc-900 text-white">Everyone</option>
              {members.map((m) => (
                <option key={m.id} value={m.name} className="bg-zinc-900 text-white">
                  {m.name} ({m.role_type === "manager" ? "Manager" : "Developer"})
                </option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-zinc-500 font-mono text-[10px]">Priority:</span>
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-zinc-900 text-white">All Priorities</option>
              <option value="urgent" className="bg-zinc-900 text-rose-300">Urgent</option>
              <option value="high" className="bg-zinc-900 text-amber-300">High</option>
              <option value="medium" className="bg-zinc-900 text-blue-300">Medium</option>
              <option value="low" className="bg-zinc-900 text-zinc-300">Low</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search tasks..."
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

          {/* View Mode Toggle: Kanban vs List */}
          <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900 p-0.5 text-xs">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                viewMode === "kanban"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Kanban Board View"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                viewMode === "list"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="List View"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-12 flex flex-col items-center justify-center py-16 text-zinc-500">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="mt-3 text-xs font-mono">Loading task board...</p>
        </div>
      ) : (
        <div className="mt-6">
          {/* ============================================================ */}
          {/* VIEW 1: KANBAN BOARD */}
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
                    {/* Stage Column Header */}
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

                    {/* Task Cards in this Stage */}
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
                              onClick={() => setTaskDetail(task)}
                              className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/90 hover:border-indigo-500/50 hover:bg-zinc-850 p-4 shadow-md transition-all cursor-pointer"
                            >
                              {/* Top chips: Priority + Project */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span
                                  className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-medium flex items-center gap-1 ${priorityConf.badge}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${priorityConf.dot}`} />
                                  <span>{priorityConf.label}</span>
                                </span>

                                <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[130px]">
                                  {task.project_name}
                                </span>
                              </div>

                              {/* Title & Description */}
                              <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                                {task.title}
                              </h3>
                              <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>

                              {/* Due Date & Overdue flag */}
                              <div className="mt-3 flex items-center gap-2 text-[10px] font-mono">
                                <span className="text-zinc-500">Due:</span>
                                <span className={overdue ? "text-rose-400 font-semibold" : "text-zinc-300"}>
                                  {formatDate(task.due_date)}
                                </span>
                                {overdue && (
                                  <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] text-rose-300 font-bold">
                                    OVERDUE
                                  </span>
                                )}
                              </div>

                              {/* Bottom row: Assignee Avatar + Stage Shift Controls */}
                              <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                                {/* Assignee */}
                                <div className="flex items-center gap-1.5 min-w-0" title={`Assigned to: ${task.assigned_to_name || "Unassigned"}`}>
                                  <div className="h-6 w-6 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0">
                                    {task.assigned_to_name
                                      ? task.assigned_to_name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .slice(0, 2)
                                      : "U"}
                                  </div>
                                  <span className="text-[11px] text-zinc-300 font-medium truncate max-w-[90px]">
                                    {task.assigned_to_name || "Unassigned"}
                                  </span>
                                </div>

                                {/* Quick Stage Shift Arrows */}
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
          {/* VIEW 2: LIST VIEW */}
          {/* ============================================================ */}
          {viewMode === "list" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Task Title</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Stage</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                          No tasks match current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => {
                        const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                        const stageConf = STAGE_CONFIG[task.stage];
                        const overdue = isOverdue(task.due_date, task.stage);

                        return (
                          <tr
                            key={task.id}
                            onClick={() => setTaskDetail(task)}
                            className="hover:bg-zinc-850/60 transition cursor-pointer"
                          >
                            <td className="py-3.5 px-4 font-semibold text-white max-w-xs truncate">
                              {task.title}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px] max-w-[150px] truncate">
                              {task.project_name}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-mono ${stageConf.badge}`}
                              >
                                {stageConf.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-mono ${priorityConf.badge}`}
                              >
                                {priorityConf.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
                                  {task.assigned_to_name
                                    ? task.assigned_to_name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .slice(0, 2)
                                    : "U"}
                                </div>
                                <span className="text-zinc-300 font-medium truncate max-w-[120px]">
                                  {task.assigned_to_name || "Unassigned"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px]">
                              <span className={overdue ? "text-rose-400 font-bold" : "text-zinc-400"}>
                                {formatDate(task.due_date)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setTaskDetail(task)}
                                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Manage
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
      {/* MODAL 1: ADD TASK MODAL */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create Workspace Task"
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-white">Create New Task</h2>
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
              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement PyMuPDF extraction loop"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Assign to Project *
                </label>
                <select
                  value={taskForm.project_name}
                  onChange={(e) => setTaskForm({ ...taskForm, project_name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assign to Member (Separating Managers and Developers) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Assign to Team Member
                </label>
                <select
                  value={taskForm.assigned_to_id}
                  onChange={(e) => setTaskForm({ ...taskForm, assigned_to_id: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">Unassigned (Open pool)</option>
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
                    <option value="urgent">Urgent Escalation</option>
                  </select>
                </div>
              </div>

              {/* Stage Where It's Now */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Current Workflow Stage *
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

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Task Objectives & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline expected deliverables, acceptance criteria, or API dependencies..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
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
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Task</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: TASK DETAIL & EDIT MODAL (Triggered when clicking task) */}
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
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md border px-2.5 py-0.5 text-[10px] font-mono font-medium ${
                    STAGE_CONFIG[taskDetail.stage].badge
                  }`}
                >
                  Stage: {STAGE_CONFIG[taskDetail.stage].label}
                </span>

                <span
                  className={`rounded-md border px-2.5 py-0.5 text-[10px] font-mono font-medium ${
                    PRIORITY_CONFIG[taskDetail.priority]?.badge
                  }`}
                >
                  {PRIORITY_CONFIG[taskDetail.priority]?.label} Priority
                </span>
              </div>

              <button
                onClick={() => setTaskDetail(null)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Task Title & Project */}
            <div className="mt-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-indigo-400">
                {taskDetail.project_name}
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">{taskDetail.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
                {taskDetail.description || "No description provided."}
              </p>
            </div>

            {/* Stage Selector (Where it is now) */}
            <div className="mt-5 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Workflow Stage Progression
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStageChange(taskDetail.id, s)}
                    className={`py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      taskDetail.stage === s
                        ? "border-indigo-500 bg-indigo-600 text-white shadow-xs"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {STAGE_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Metadata: Due Date & Member Reassignment */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            {/* Bottom Actions: Delete Task & Close */}
            <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => handleDeleteTask(taskDetail.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/40 bg-rose-950/20 hover:bg-rose-900/40 text-xs font-semibold text-rose-300 transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Task</span>
              </button>

              <button
                onClick={() => setTaskDetail(null)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            Loading Task Board...
          </div>
        </div>
      }
    >
      <TasksContent />
    </Suspense>
  );
}
