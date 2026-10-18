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
  computeStoryProgress,
  computeProjectProgress,
} from "@/utils/workspaceData";
import CuteOwlAvatar from "@/components/CuteOwlAvatar";
import OwlLoader from "@/components/OwlLoader";

interface PageParams {
  id: string;
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

  // State
  const [project, setProject] = useState<ProjectSeed | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false);
  const [targetStoryIdForNewTask, setTargetStoryIdForNewTask] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    description: "",
    assigned_to_id: "",
    priority: "medium" as TaskPriority,
    stage: "todo" as TaskStage,
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    descriptive_path: "",
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
    setLoading(true);

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

  /**
   * GLOBAL CASCADE: When story due date or priority is changed globally,
   * it reflects to all tasks under that story!
   */
  const handleStoryGlobalCascadeChange = async (
    story: Story,
    field: "due_date" | "priority",
    newValue: string
  ) => {
    const updates: Partial<Story> = {
      [field]: newValue,
    };

    const { stories: updatedStories, tasks: updatedTasks } = await updateWorkspaceStory(
      story.id,
      updates,
      true, // cascadeToTasks = true!
      supabase
    );

    setStories(updatedStories);
    setTasks(updatedTasks);

    const childCount = (tasksByStoryId[story.id] || []).length;
    showToast(
      `Story ${field === "due_date" ? "Due Date" : "Priority"} updated to "${newValue}" and cascaded to ${childCount} child task${
        childCount === 1 ? "" : "s"
      }!`
    );
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

  // --------------------------------------------------------------------------
  // Task Handlers (Add to Story, Move Progress / Stage, Change Priority, Due Date)
  // --------------------------------------------------------------------------
  const handleCreateTaskForStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim() || !project || !targetStoryIdForNewTask) return;

    const parentStory = stories.find((s) => s.id === targetStoryIdForNewTask);
    const assignedMember = newTaskForm.assigned_to_id ? membersMap.get(newTaskForm.assigned_to_id) : null;

    const created = await createWorkspaceTask(
      {
        project_id: project.id,
        story_id: targetStoryIdForNewTask,
        story_title: parentStory?.title || null,
        project_name: project.name,
        title: newTaskForm.title.trim(),
        description: newTaskForm.description.trim(),
        stage: newTaskForm.stage,
        priority: newTaskForm.priority,
        due_date: newTaskForm.due_date,
        assigned_to_id: assignedMember ? assignedMember.id : null,
        assigned_to_name: assignedMember ? assignedMember.name : null,
        assigned_to_role: assignedMember ? assignedMember.role_title : null,
        descriptive_paths: newTaskForm.descriptive_path.trim()
          ? [newTaskForm.descriptive_path.trim()]
          : [],
      },
      supabase
    );

    const updatedTasks = [created, ...tasks];
    setTasks(updatedTasks);

    // Refresh story progress
    const freshStories = await fetchWorkspaceStories(supabase, project.id);
    setStories(freshStories);

    setIsNewTaskModalOpen(false);
    setTargetStoryIdForNewTask(null);
    setNewTaskForm({
      title: "",
      description: "",
      assigned_to_id: "",
      priority: "medium",
      stage: "todo",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      descriptive_path: "",
    });
    showToast(`Task "${created.title}" added to story.`);
  };

  /**
   * Move task progress stage: increases or decreases parent story progress and project progress bar!
   */
  const handleTaskStageChange = async (taskId: string, newStage: TaskStage) => {
    const updated = await updateWorkspaceTask(taskId, { stage: newStage }, supabase);
    setTasks(updated);

    // Refresh parent stories to see the dynamic progress increase / decrease immediately!
    const freshStories = await fetchWorkspaceStories(supabase, project?.id || projectId);
    setStories(freshStories);

    showToast(`Task progress moved to "${STAGE_CONFIG[newStage].label}". Story & Project progress updated!`);
  };

  const handleTaskPriorityChange = async (taskId: string, newPriority: TaskPriority) => {
    const updated = await updateWorkspaceTask(taskId, { priority: newPriority }, supabase);
    setTasks(updated);
    showToast(`Task priority set to "${newPriority}".`);
  };

  const handleTaskDueDateChange = async (taskId: string, newDueDate: string) => {
    const updated = await updateWorkspaceTask(taskId, { due_date: newDueDate }, supabase);
    setTasks(updated);
    showToast(`Task due date updated.`);
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    const remaining = await deleteWorkspaceTask(taskId, supabase);
    setTasks(remaining);
    const freshStories = await fetchWorkspaceStories(supabase, project?.id || projectId);
    setStories(freshStories);
    showToast(`Task "${title}" removed.`);
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
          className="mt-4 inline-block px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-zinc-950 transition"
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
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-amber-500/40 bg-zinc-900/95 px-4 py-2.5 text-xs text-amber-200 shadow-2xl backdrop-blur-md animate-scale-up flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ===== BREADCRUMB & VIEW TOGGLE TABS ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Link href="/projects" className="hover:text-amber-400 transition flex items-center gap-1">
            <span>&larr; Projects</span>
          </Link>
          <span>/</span>
          <span className="text-zinc-200 font-bold truncate max-w-[200px] sm:max-w-xs">{project.name}</span>
          <span>/</span>
          <span className="text-amber-400 font-semibold">Stories & Hierarchy</span>
        </div>

        {/* View Switcher: Stories Hierarchy vs Sprint Tasks Kanban */}
        <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950/80 p-1">
          <Link
            href={`/projects/${encodeURIComponent(project.id)}/stories`}
            style={{
              backgroundColor: "var(--accent-subtle)",
              borderColor: "var(--accent-border)",
              color: "var(--accent-text)",
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition"
          >
            <span>📖</span>
            <span>Stories & Tasks Hierarchy</span>
          </Link>
          <Link
            href={`/projects/${encodeURIComponent(project.id)}/tasks`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition"
          >
            <span>📋</span>
            <span>Sprint Tasks Board</span>
          </Link>
        </div>
      </div>

      {/* ===== OVERARCHING PROJECT HEADER & DUAL PROGRESS ROLLUP ===== */}
      <div className="mt-6 rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-xl">
        {/* Ambient accent backlight */}
        <div
          className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: "var(--accent-color)" }}
        />

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium border border-amber-500/30 bg-amber-500/10 text-amber-300">
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
                style={{
                  backgroundColor: "var(--accent-color)",
                  boxShadow: "0 4px 16px var(--accent-glow)",
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-950 transition hover:opacity-95 hover:scale-[1.02] cursor-pointer"
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
                background: `linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, var(--accent-color) 100%)`,
                boxShadow: "0 0 14px var(--accent-glow)",
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
            <p className="mt-1 text-lg font-bold text-amber-300">
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
            className="rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
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
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-xs font-bold text-zinc-950 transition hover:bg-amber-400 cursor-pointer"
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

            return (
              <div
                key={story.id}
                className="rounded-3xl border border-zinc-800/90 bg-zinc-900/60 backdrop-blur-md overflow-hidden shadow-lg transition-all hover:border-zinc-700"
              >
                {/* STORY HEADER (Parent Container) */}
                <div className="p-5 sm:p-6 border-b border-zinc-800/80 bg-zinc-950/40">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Story Title & Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold">
                          STORY
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${statusStyle.badge}`}>
                          {statusStyle.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${priorityStyle.badge}`}>
                          {priorityStyle.label} Priority
                        </span>
                      </div>

                      <Link
                        href={`/projects/${encodeURIComponent(project.id)}/stories/${encodeURIComponent(story.id)}`}
                        className="group/title block"
                        title="Click to open full tasks view for this story"
                      >
                        <h3 className="mt-2 text-base sm:text-lg font-bold text-white tracking-tight group-hover/title:text-amber-400 transition-colors flex items-center gap-2">
                          <span>{story.title}</span>
                          <span className="text-xs text-amber-400 opacity-70 group-hover/title:opacity-100 transition-opacity">&rarr;</span>
                        </h3>
                      </Link>
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed font-light">
                        {story.description}
                      </p>
                    </div>

                    {/* GLOBAL CASCADE CONTROLS ON THE STORY:
                        Changing Due Date or Priority reflects at all tasks under them! */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0 p-2.5 rounded-2xl border border-zinc-800 bg-zinc-950/80">
                      {/* Global Due Date Picker */}
                      <div className="flex flex-col">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 mb-0.5">
                          Global Due Date (Cascades)
                        </label>
                        <input
                          type="date"
                          disabled={!canEditStory}
                          value={story.due_date ? story.due_date.split("T")[0] : ""}
                          onChange={(e) =>
                            handleStoryGlobalCascadeChange(story, "due_date", e.target.value)
                          }
                          title={canEditStory ? "Changing this globally reflects on all child tasks" : "Only Admins & Managers can edit story dates"}
                          className={`rounded-lg border px-2 py-1 text-xs font-mono focus:outline-none ${
                            canEditStory
                              ? "border-zinc-700 bg-zinc-900 text-amber-200 focus:border-amber-400 cursor-pointer"
                              : "border-zinc-800 bg-zinc-950 text-zinc-500 cursor-not-allowed opacity-75"
                          }`}
                        />
                      </div>

                      {/* Global Priority Selector */}
                      <div className="flex flex-col">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 mb-0.5">
                          Global Priority (Cascades)
                        </label>
                        <select
                          value={story.priority}
                          disabled={!canEditStory}
                          onChange={(e) =>
                            handleStoryGlobalCascadeChange(story, "priority", e.target.value)
                          }
                          title={canEditStory ? "Changing this globally reflects on all child tasks" : "Only Admins & Managers can edit story priority"}
                          className={`rounded-lg border px-2 py-1 text-xs font-mono focus:outline-none ${
                            canEditStory
                              ? "border-zinc-700 bg-zinc-900 text-zinc-200 focus:border-amber-400 cursor-pointer"
                              : "border-zinc-800 bg-zinc-950 text-zinc-500 cursor-not-allowed opacity-75"
                          }`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      {/* View Tasks & Add Task button & Delete story */}
                      <div className="flex items-center gap-1.5 mt-auto">
                        <Link
                          href={`/projects/${encodeURIComponent(project.id)}/stories/${encodeURIComponent(story.id)}`}
                          className="px-2.5 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-semibold transition"
                          title="Open dedicated tasks Kanban board for this story"
                        >
                          📋 Tasks ({childTasks.length}) &rarr;
                        </Link>
                        {canAddTask && (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetStoryIdForNewTask(story.id);
                              setIsNewTaskModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition cursor-pointer"
                            title="Add new child task to this story"
                          >
                            + Task
                          </button>
                        )}
                        {canDeleteStory && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStory(story.id, story.title)}
                            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-zinc-850 transition cursor-pointer"
                            title="Delete this story"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* STORY PROGRESS BAR (Rolls up from child tasks) */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/60">
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <span>Story Progress:</span>
                        <span className="text-white font-bold">{storyProgress}%</span>
                        <span className="text-zinc-500">
                          ({childTasks.filter((t) => t.stage === "done").length}/{childTasks.length} tasks done)
                        </span>
                      </span>
                      <Link
                        href={`/projects/${encodeURIComponent(project.id)}/stories/${encodeURIComponent(story.id)}`}
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <span>Open Story Tasks Board</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${storyProgress}%`,
                          backgroundColor: storyProgress === 100 ? "#34d399" : "#f59e0b",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* NESTED CHILD TASKS SECTION UNDER STORY */}
                <div className="p-4 sm:p-6 bg-zinc-950/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                      Tasks under this Story ({childTasks.length})
                    </span>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/projects/${encodeURIComponent(project.id)}/stories/${encodeURIComponent(story.id)}`}
                        className="text-xs font-mono text-sky-400 hover:text-sky-300 transition flex items-center gap-1 font-semibold"
                      >
                        <span>Open Story Tasks Board &rarr;</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetStoryIdForNewTask(story.id);
                          setIsNewTaskModalOpen(true);
                        }}
                        className="text-xs font-mono text-amber-400 hover:text-amber-300 transition"
                      >
                        + Add task
                      </button>
                    </div>
                  </div>

                  {childTasks.length === 0 ? (
                    <div className="p-4 rounded-2xl border border-dashed border-zinc-800 text-center">
                      <p className="text-xs text-zinc-500">
                        No tasks assigned to this story yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetStoryIdForNewTask(story.id);
                          setIsNewTaskModalOpen(true);
                        }}
                        className="mt-2 text-xs font-semibold text-amber-400 hover:underline cursor-pointer"
                      >
                        + Create first task
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {childTasks.map((task) => {
                        const assignedMember = task.assigned_to_id ? membersMap.get(task.assigned_to_id) : null;
                        const taskStageStyle = STAGE_CONFIG[task.stage];
                        const taskPriorityStyle = PRIORITY_CONFIG[task.priority];

                        return (
                          <div
                            key={task.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 transition shadow-xs"
                          >
                            {/* Task details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-white truncate">
                                  {task.title}
                                </span>
                              </div>
                              {task.description && (
                                <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">
                                  {task.description}
                                </p>
                              )}

                              {/* Descriptive paths pill */}
                              {task.descriptive_paths && task.descriptive_paths.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {task.descriptive_paths.map((p) => (
                                    <span
                                      key={p}
                                      className="px-1.5 py-0.2 rounded border border-zinc-800 bg-zinc-950 font-mono text-[9px] text-zinc-400 truncate max-w-xs"
                                    >
                                      📄 {p}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Task Controls: Stage (Progress), Priority, Due Date, Assignee */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {/* Cute Owl Avatar Assignee */}
                              {assignedMember ? (
                                <div
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-xl border border-zinc-800 bg-zinc-950"
                                  title={`Assigned to ${assignedMember.name} (${assignedMember.role_title})`}
                                >
                                  <CuteOwlAvatar owlId={assignedMember.owl_avatar} size="xs" />
                                  <span className="text-[11px] text-zinc-200 font-medium truncate max-w-[80px]">
                                    {assignedMember.name.split(" ")[0]}
                                  </span>
                                </div>
                              ) : (
                                <span className="px-2 py-1 rounded-xl border border-zinc-800/80 bg-zinc-950 text-[10px] text-zinc-500 font-mono">
                                  Unassigned
                                </span>
                              )}

                              {/* Editable Stage / Progress selector */}
                              <select
                                value={task.stage}
                                onChange={(e) =>
                                  handleTaskStageChange(task.id, e.target.value as TaskStage)
                                }
                                title="Move progress stage (Immediately recalculates story and project progress)"
                                className={`rounded-xl border px-2.5 py-1 text-xs font-mono font-semibold cursor-pointer ${taskStageStyle.badge}`}
                              >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">In Review</option>
                                <option value="done">Completed</option>
                              </select>

                              {/* Editable Task Priority */}
                              <select
                                value={task.priority}
                                onChange={(e) =>
                                  handleTaskPriorityChange(task.id, e.target.value as TaskPriority)
                                }
                                title="Task Priority (Editable independently from story)"
                                className="rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-mono text-zinc-300 cursor-pointer"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>

                              {/* Editable Task Due Date */}
                              <input
                                type="date"
                                value={task.due_date ? task.due_date.split("T")[0] : ""}
                                onChange={(e) => handleTaskDueDateChange(task.id, e.target.value)}
                                title="Task Due Date (Editable independently from story)"
                                className="rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-mono text-zinc-300 cursor-pointer"
                              />

                              {/* Delete task */}
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id, task.title)}
                                className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-850 transition"
                                title="Delete task"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
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
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                  style={{ backgroundColor: "var(--accent-color)" }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-zinc-950 hover:opacity-90 transition cursor-pointer"
                >
                  Create Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL 2: ADD TASK DIRECTLY UNDER STORY ===== */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl text-left animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white">Add Task under Story</h3>
                <p className="text-xs text-amber-300 font-mono">
                  {stories.find((s) => s.id === targetStoryIdForNewTask)?.title || "Selected Story"}
                </p>
              </div>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTaskForStory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement PyMuPDF tabular chunking"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Task Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Technical instructions or execution details..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Descriptive File / Workflow Path
                </label>
                <input
                  type="text"
                  placeholder="e.g. rag-pipeline/extraction/pdf_tables.py"
                  value={newTaskForm.descriptive_path}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, descriptive_path: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Assignee (Owl)
                  </label>
                  <select
                    value={newTaskForm.assigned_to_id}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, assigned_to_id: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role_title})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) =>
                      setNewTaskForm({ ...newTaskForm, priority: e.target.value as TaskPriority })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Stage
                  </label>
                  <select
                    value={newTaskForm.stage}
                    onChange={(e) =>
                      setNewTaskForm({ ...newTaskForm, stage: e.target.value as TaskStage })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  value={newTaskForm.due_date}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, due_date: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: "var(--accent-color)" }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-zinc-950 hover:opacity-90 transition cursor-pointer"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
