"use client";

import { use, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import {
  ProjectSeed,
  DEFAULT_PROJECTS,
  Story,
  StoryPriority,
  StoryStatus,
  STORY_STATUS_CONFIG,
  Task,
  TaskStage,
  TaskPriority,
  Member,
  SystemRole,
  isDefaultAdmin,
  STAGE_CONFIG,
  PRIORITY_CONFIG,
  fetchWorkspaceStories,
  createWorkspaceStory,
  updateWorkspaceStory,
  deleteWorkspaceStory,
  fetchWorkspaceTasks,
  createWorkspaceTask,
  updateWorkspaceTask,
  deleteWorkspaceTask,
  fetchWorkspaceMembers,
  getStoriesLocal,
  getTasksLocal,
  getMembersLocal,
  computeStoryProgress,
  computeProjectProgress,
} from "@/utils/workspaceData";
import CuteOwlAvatar from "@/components/CuteOwlAvatar";
import OwlLoader from "@/components/OwlLoader";

interface PageParams {
  id: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "No target date";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectStoriesPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolvedParams = use(params);
  const projectId = decodeURIComponent(resolvedParams.id);
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();

  // State with safe client-side hydration to avoid SSR mismatches
  const [project, setProject] = useState<ProjectSeed | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setStories(getStoriesLocal());
    setTasks(getTasksLocal());
    setMembers(getMembersLocal());
  }, []);

  // Derive current user member & role permissions
  const currentUserMember = useMemo(() => {
    if (user?.email) {
      return (
        members.find(
          (m) =>
            (m.email && m.email.toLowerCase() === user.email?.toLowerCase()) ||
            m.id === user.id
        ) || null
      );
    }
    return members.find((m) => isDefaultAdmin(m.name, m.email)) || members[0] || null;
  }, [user, members]);

  const currentUserRole: SystemRole = (currentUserMember?.system_role as SystemRole) || "Admin";
  const canAddStory = currentUserRole === "Admin" || currentUserRole === "Manager";
  const canEditStory = currentUserRole === "Admin" || currentUserRole === "Manager";
  const canDeleteStory = currentUserRole === "Admin" || currentUserRole === "Manager";
  const canAddTask = currentUserRole === "Admin" || currentUserRole === "Manager" || currentUserRole === "Developer";
  const isViewer = currentUserRole === "Viewer";

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Modals & Forms
  const [isNewStoryModalOpen, setIsNewStoryModalOpen] = useState<boolean>(false);
  const [newStoryForm, setNewStoryForm] = useState({
    title: "",
    description: "",
    priority: "medium" as StoryPriority,
    status: "open" as StoryStatus,
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
  });

  // Story Edit State
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load Initial Data
  const loadWorkspaceData = useCallback(async () => {
    if (stories.length === 0) setLoading(true);

    // 1. Resolve project
    let currentProj: ProjectSeed | null = null;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("cognitive_projects");
        if (stored) {
          const list: ProjectSeed[] = JSON.parse(stored);
          currentProj = list.find((p) => p.id === projectId || p.name === projectId) || null;
        }
      } catch {
        // Ignored
      }
    }
    if (!currentProj) {
      currentProj = DEFAULT_PROJECTS.find((p) => p.id === projectId || p.name === projectId) || null;
    }
    setProject(currentProj);

    // 2. Load members, tasks, and stories concurrently
    const [membersData, tasksData, storiesData] = await Promise.all([
      fetchWorkspaceMembers(supabase),
      fetchWorkspaceTasks(supabase),
      fetchWorkspaceStories(supabase, currentProj?.id || projectId),
    ]);

    setMembers(membersData);
    setTasks(tasksData);
    setStories(storiesData);
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Project Tasks
  const projectTasks = useMemo(() => {
    if (!project) return [];
    return tasks.filter(
      (t) => t.project_id === project.id || t.project_id === projectId || t.project_name === project.name
    );
  }, [tasks, project, projectId]);

  // Project Stories
  const projectStories = useMemo(() => {
    if (!project) return [];
    return stories.filter((s) => s.project_id === project.id || s.project_id === projectId);
  }, [stories, project, projectId]);

  // Dynamic Overall Project Progress Bar combining Stories and Tasks
  const projectProgressData = useMemo(() => {
    return computeProjectProgress(project?.id || projectId, projectStories, projectTasks);
  }, [project, projectId, projectStories, projectTasks]);

  // Map of Tasks grouped by Story ID
  const tasksByStoryId = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const story of projectStories) {
      map[story.id] = [];
    }
    for (const task of projectTasks) {
      if (task.story_id && map[task.story_id]) {
        map[task.story_id].push(task);
      }
    }
    return map;
  }, [projectStories, projectTasks]);

  // Filtered Stories
  const filteredStories = useMemo(() => {
    return projectStories.filter((story) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPriority = priorityFilter === "all" || story.priority === priorityFilter;
      return matchSearch && matchPriority;
    });
  }, [projectStories, searchQuery, priorityFilter]);

  // Member map for quick lookup
  const membersMap = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) {
      map.set(m.id, m);
    }
    return map;
  }, [members]);

  // --------------------------------------------------------------------------
  // Story Handlers (Create, Global Cascade Update, Delete)
  // --------------------------------------------------------------------------
  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryForm.title.trim() || !project) return;

    const created = await createWorkspaceStory(
      {
        project_id: project.id,
        project_name: project.name,
        title: newStoryForm.title.trim(),
        description: newStoryForm.description.trim(),
        priority: newStoryForm.priority,
        status: newStoryForm.status,
        due_date: newStoryForm.due_date,
      },
      supabase
    );

    setStories((prev) => [created, ...prev]);
    setIsNewStoryModalOpen(false);
    setNewStoryForm({
      title: "",
      description: "",
      priority: "medium",
      status: "open",
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    });
    showToast(`Story "${created.title}" created successfully.`);
  };

  const handleDeleteStory = async (storyId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the story "${title}"? Child tasks will be unlinked.`)) {
      return;
    }
    const { stories: remainingStories, tasks: remainingTasks } = await deleteWorkspaceStory(
      storyId,
      supabase
    );
    setStories(remainingStories);
    setTasks(remainingTasks);
    showToast(`Story "${title}" deleted.`);
  };

  // Loading state with OwlLoader
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24">
        <OwlLoader
          size="lg"
          text="Buffering Stories & Tasks Architecture..."
          subtext="Mapping hierarchical database records and progress rollups"
        />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-white">Project Not Found</h1>
        <p className="mt-2 text-xs text-zinc-400">Could not resolve project identifier &quot;{projectId}&quot;.</p>
        <Link
          href="/projects"
          className="mt-4 inline-block px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 shadow-sm transition active:scale-95"
        >
          &larr; Return to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col mx-auto w-full max-w-7xl px-4 sm:px-8 py-8 animate-fade-in">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-2.5 text-xs text-zinc-200 shadow-2xl backdrop-blur-md animate-scale-up flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-zinc-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ===== BREADCRUMB & VIEW TOGGLE TABS ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Link href="/projects" className="hover:text-zinc-200 transition flex items-center gap-1">
            <span>&larr; Projects</span>
          </Link>
          <span>/</span>
          <span className="text-zinc-200 font-bold truncate max-w-[200px] sm:max-w-xs">{project.name}</span>
          <span>/</span>
          <span className="text-zinc-300 font-medium">Stories & Hierarchy</span>
        </div>

        {/* Navigation Action */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900 text-xs text-zinc-400 hover:text-white transition"
        >
          <span>&larr;</span>
          <span>All Projects</span>
        </Link>
      </div>

      {/* ===== OVERARCHING PROJECT HEADER & DUAL PROGRESS ROLLUP ===== */}
      <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 relative overflow-hidden shadow-md">

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium border border-zinc-800 bg-zinc-950/70 text-zinc-400">
                {project.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono border border-zinc-700 bg-zinc-800/80 text-zinc-300">
                Parent Project
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                Updated {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {project.name}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed font-light">
              {project.description}
            </p>

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md border border-zinc-800 bg-zinc-950/70 text-[10px] font-mono text-zinc-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            {canAddStory ? (
              <button
                onClick={() => setIsNewStoryModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition cursor-pointer shadow-sm active:scale-95"
              >
                <span>+ New Story</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-[11px] font-mono text-zinc-400">
                <span>🔒</span>
                <span>Stories (Admins & Managers Only)</span>
              </div>
            )}
          </div>
        </div>

        {/* ===== PROJECT OVERALL PROGRESS BAR (BASED ON BOTH STORIES & TASKS) ===== */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full animate-ping"
                style={{ backgroundColor: "var(--accent-color)" }}
              />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Project Overall Progress (Stories + Tasks Rollup)
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-zinc-400">
                {projectProgressData.completedStories}/{projectProgressData.totalStories} Stories done
              </span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-zinc-400">
                {projectProgressData.doneTasks}/{projectProgressData.totalTasks} Tasks completed
              </span>
              <span className="text-zinc-600">&bull;</span>
              <span
                className="font-bold text-sm"
                style={{ color: "var(--accent-color)" }}
              >
                {projectProgressData.progress}%
              </span>
            </div>
          </div>

          {/* Overarching Progress Track */}
          <div className="h-3 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${projectProgressData.progress}%`,
                background: projectProgressData.progress === 100
                  ? "#34d399"
                  : `linear-gradient(90deg, rgba(255,255,255,0.7) 0%, var(--accent-color) 100%)`,
              }}
            />
          </div>
        </div>

        {/* Mini KPI Cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Child Stories</span>
            <p className="mt-1 text-lg font-bold text-white">{projectProgressData.totalStories}</p>
          </div>
          <div className="p-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Tasks</span>
            <p className="mt-1 text-lg font-bold text-white">{projectProgressData.totalTasks}</p>
          </div>
          <div className="p-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Completed Tasks</span>
            <p className="mt-1 text-lg font-bold text-emerald-400">{projectProgressData.doneTasks}</p>
          </div>
          <div className="p-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Velocity Health</span>
            <p className="mt-1 text-lg font-bold text-emerald-400">
              {projectProgressData.progress >= 70 ? "Optimal" : projectProgressData.progress >= 30 ? "Steady" : "Starting"}
            </p>
          </div>
        </div>
      </div>

      {/* ===== STORIES FILTER & CONTROLS ===== */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">Project Stories</h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400">
            {filteredStories.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <input
            type="text"
            placeholder="Search stories or child tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
          />

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* ===== STORIES LIST WITH CHILD TASKS UNDER EACH STORY ===== */}
      <div className="mt-5 space-y-6">
        {filteredStories.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 p-12 text-center">
            <span className="text-3xl">📖</span>
            <h3 className="mt-2 text-sm font-bold text-white">No stories match your criteria</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Create your first project story to organize tasks into cohesive milestones.
            </p>
            {canAddStory && (
              <button
                onClick={() => setIsNewStoryModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 transition cursor-pointer shadow-sm active:scale-95"
              >
                + Create First Story
              </button>
            )}
          </div>
        ) : (
          filteredStories.map((story) => {
            const childTasks = tasksByStoryId[story.id] || [];
            const storyProgress = computeStoryProgress(story.id, projectTasks);
            const statusStyle = STORY_STATUS_CONFIG[story.status];
            const priorityStyle = PRIORITY_CONFIG[story.priority];
            const todoCount = childTasks.filter((t) => t.stage === "todo").length;
            const inProgressCount = childTasks.filter((t) => t.stage === "in_progress").length;
            const reviewCount = childTasks.filter((t) => t.stage === "review").length;
            const doneCount = childTasks.filter((t) => t.stage === "done").length;

            // Distinct assignees for this story
            const assigneeIds = Array.from(new Set(childTasks.map((t) => t.assigned_to_id).filter(Boolean))) as string[];
            const storyAssignees = assigneeIds.map((id) => membersMap.get(id)).filter(Boolean) as Member[];

            return (
              <div
                key={story.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  router.push(
                    `/projects/${encodeURIComponent(project.id)}/stories/${encodeURIComponent(story.id)}`
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(
                      `/projects/${encodeURIComponent(project.id)}/stories/${encodeURIComponent(story.id)}`
                    );
                  }
                }}
                className="group relative rounded-3xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 overflow-hidden shadow-md transition-all duration-200 cursor-pointer p-5 sm:p-6"
                title="Click or touch story bar to view complete story details and tasks"
              >
                {/* Ambient glow accent on hover */}
                <div
                  className="absolute -top-16 -right-16 h-36 w-36 rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-15 transition-opacity duration-300"
                  style={{ backgroundColor: "var(--accent-color)" }}
                />

                {/* Top Row: Badges, Due Date, and Delete Button */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-zinc-800 bg-zinc-950 text-zinc-400 font-medium">
                      STORY
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${statusStyle.badge}`}>
                      {statusStyle.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${priorityStyle.badge}`}>
                      {priorityStyle.label} Priority
                    </span>
                    {story.due_date && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-zinc-800 bg-zinc-950/80 text-zinc-300 flex items-center gap-1">
                        <span>📅</span>
                        <span>Due {formatDate(story.due_date)}</span>
                      </span>
                    )}
                  </div>

                  {canDeleteStory && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStory(story.id, story.title);
                      }}
                      className="p-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer shrink-0"
                      title="Delete this story"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Story Title & Description */}
                <div className="mt-3">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-zinc-100 transition-colors flex items-center gap-2">
                    <span>{story.title}</span>
                    <span className="text-sm text-zinc-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                      &rarr;
                    </span>
                  </h3>
                  {story.description && (
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed font-light line-clamp-2">
                      {story.description}
                    </p>
                  )}
                </div>

                {/* Story Milestone Progress Track */}
                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <span>Story Progress:</span>
                      <span className="text-white font-bold">{storyProgress}%</span>
                      <span className="text-zinc-500">
                        ({doneCount}/{childTasks.length} tasks completed)
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-200 flex items-center gap-1">
                      <span>View details & tasks</span>
                      <span>&rarr;</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${storyProgress}%`,
                        backgroundColor: storyProgress === 100 ? "#34d399" : "var(--accent-color, #93c5fd)",
                      }}
                    />
                  </div>
                </div>

                {/* Quick Task Summary & Assignee Avatars */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800/40 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg border border-zinc-700/80 bg-zinc-800/60 text-zinc-300 font-mono text-[11px] font-semibold">
                      📋 {childTasks.length} {childTasks.length === 1 ? "task" : "tasks"}
                    </span>
                    {doneCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
                        ✓ {doneCount} done
                      </span>
                    )}
                    {inProgressCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md border border-sky-500/25 bg-sky-500/10 text-sky-300 font-mono text-[10px]">
                        ⚡ {inProgressCount} active
                      </span>
                    )}
                    {reviewCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md border border-indigo-400/25 bg-indigo-500/10 text-indigo-200 font-mono text-[10px]">
                        👁 {reviewCount} in review
                      </span>
                    )}
                    {todoCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 font-mono text-[10px]">
                        ○ {todoCount} to do
                      </span>
                    )}
                  </div>

                  {/* Assignee Owls Preview */}
                  {storyAssignees.length > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0" title="Assigned team members">
                      <div className="flex -space-x-1.5">
                        {storyAssignees.slice(0, 4).map((assignee) => (
                          <div
                            key={assignee.id}
                            className="ring-2 ring-zinc-900 rounded-full"
                            title={assignee.name}
                          >
                            <CuteOwlAvatar owlId={assignee.owl_avatar} size="xs" />
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {storyAssignees.length} {storyAssignees.length === 1 ? "assignee" : "assignees"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Compact Task Preview (first 3 tasks) */}
                {childTasks.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                    {childTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-zinc-800/60 bg-zinc-950/40 text-[11px] text-zinc-300 truncate"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STAGE_CONFIG[task.stage].dot}`} />
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}
                    {childTasks.length > 3 && (
                      <div className="flex items-center px-2 py-1 text-[10px] font-mono text-zinc-500">
                        +{childTasks.length - 3} more tasks &rarr;
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ===== MODAL 1: CREATE NEW STORY ===== */}
      {isNewStoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl text-left animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white">Create New Story</h3>
                <p className="text-xs text-zinc-400">Child of {project.name}</p>
              </div>
              <button
                onClick={() => setIsNewStoryModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Story Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Autonomous Financial Extraction Pipeline"
                  value={newStoryForm.title}
                  onChange={(e) => setNewStoryForm({ ...newStoryForm, title: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Story Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline key milestones, sub-agents, or functional goals..."
                  value={newStoryForm.description}
                  onChange={(e) => setNewStoryForm({ ...newStoryForm, description: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newStoryForm.priority}
                    onChange={(e) =>
                      setNewStoryForm({ ...newStoryForm, priority: e.target.value as StoryPriority })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newStoryForm.due_date}
                    onChange={(e) => setNewStoryForm({ ...newStoryForm, due_date: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewStoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition cursor-pointer shadow-sm active:scale-95"
                >
                  Create Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
