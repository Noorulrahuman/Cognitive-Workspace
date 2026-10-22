"use client";

import { use, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
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
  updateWorkspaceStory,
  fetchWorkspaceTasks,
  createWorkspaceTask,
  updateWorkspaceTask,
  deleteWorkspaceTask,
  fetchWorkspaceMembers,
  computeStoryProgress,
  mapStatusToStage,
} from "@/utils/workspaceData";
import { useAuth } from "@/components/AuthProvider";
import CuteOwlAvatar from "@/components/CuteOwlAvatar";
import OwlLoader from "@/components/OwlLoader";

interface PageParams {
  id: string;
  storyId: string;
}

const SQL_SCHEMA_TEXT = `-- Cognitive Workspace: Supabase 3-Table Schema (Projects -> Stories -> Tasks)
-- Run this in Supabase Dashboard -> SQL Editor without conflicts:

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table: public.projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    title TEXT,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Agentic Workflow',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    source_url TEXT,
    documents_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;

-- 2. Table: public.stories (Child of Projects)
CREATE TABLE public.stories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    project_name TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'review', 'completed')),
    due_date TIMESTAMPTZ,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table: public.tasks (Child of Stories, Linked to Projects)
CREATE TABLE public.tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    story_id TEXT REFERENCES public.stories(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    stage TEXT NOT NULL DEFAULT 'todo',
    due_date TIMESTAMPTZ,
    project_name TEXT,
    story_title TEXT,
    descriptive_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
    assigned_to_id TEXT,
    assigned_to_name TEXT,
    assigned_to_role TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security & Policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read projects" ON public.projects;
CREATE POLICY "Allow read projects" ON public.projects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert projects" ON public.projects;
CREATE POLICY "Allow insert projects" ON public.projects FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update projects" ON public.projects;
CREATE POLICY "Allow update projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read stories" ON public.stories;
CREATE POLICY "Allow read stories" ON public.stories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert stories" ON public.stories;
CREATE POLICY "Allow insert stories" ON public.stories FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update stories" ON public.stories;
CREATE POLICY "Allow update stories" ON public.stories FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read tasks" ON public.tasks;
CREATE POLICY "Allow read tasks" ON public.tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert tasks" ON public.tasks;
CREATE POLICY "Allow insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update tasks" ON public.tasks;
CREATE POLICY "Allow update tasks" ON public.tasks FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete tasks" ON public.tasks;
CREATE POLICY "Allow delete tasks" ON public.tasks FOR DELETE USING (true);

-- Enable Supabase Realtime safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tasks') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'stories') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
    END IF;
END $$;
`;

function formatDate(iso: string): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDueChip(iso: string, stage: TaskStage): { text: string; style: string } | null {
  if (!iso || stage === "done") return null;
  const due = new Date(iso);
  if (isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (days < 0) {
    return {
      text: `Overdue by ${-days} day${days === -1 ? "" : "s"}`,
      style: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    };
  }
  if (days === 0) {
    return { text: "Due today", style: "border-orange-500/25 bg-orange-500/10 text-orange-300" };
  }
  if (days <= 3) {
    return {
      text: `Due in ${days} day${days === 1 ? "" : "s"}`,
      style: "border-sky-500/25 bg-sky-500/10 text-sky-300",
    };
  }
  return {
    text: `Due in ${days} days`,
    style: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
}

export default function StoryTasksPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolvedParams = use(params);
  const projectId = decodeURIComponent(resolvedParams.id);
  const storyId = decodeURIComponent(resolvedParams.storyId);
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();

  // State
  const [project, setProject] = useState<ProjectSeed | null>(null);
  const [story, setStory] = useState<Story | null>(null);
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
  const canEditStory = currentUserRole === "Admin" || currentUserRole === "Manager";
  const canAddTask = currentUserRole === "Admin" || currentUserRole === "Manager" || currentUserRole === "Developer";
  const isViewer = currentUserRole === "Viewer";

  // Filters & View Mode
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("All");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("All");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [isEditingTaskInfo, setIsEditingTaskInfo] = useState<boolean>(false);

  // Edit Task Drawer State
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editPathsText, setEditPathsText] = useState<string>("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("medium");
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [editAssigneeId, setEditAssigneeId] = useState<string>("");

  // Edit Story Modal State
  const [isEditStoryModalOpen, setIsEditStoryModalOpen] = useState<boolean>(false);
  const [editStoryTitle, setEditStoryTitle] = useState<string>("");
  const [editStoryDescription, setEditStoryDescription] = useState<string>("");
  const [editStoryPriority, setEditStoryPriority] = useState<StoryPriority>("medium");
  const [editStoryStatus, setEditStoryStatus] = useState<StoryStatus>("open");
  const [editStoryDueDate, setEditStoryDueDate] = useState<string>("");

  // New Task Form State
  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    description: "",
    assigned_to_id: "",
    priority: "medium" as TaskPriority,
    stage: "todo" as TaskStage,
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    descriptive_paths_text: "",
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Open Task Detail Drawer
  const openTaskDetail = (task: Task) => {
    setTaskDetail(task);
    setIsEditingTaskInfo(false);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPathsText((task.descriptive_paths || []).join("\n"));
    setEditPriority(task.priority);
    setEditDueDate(task.due_date ? String(task.due_date).split("T")[0] : "");
    setEditAssigneeId(task.assigned_to_id || "");
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_TEXT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Load Initial Project, Story, Tasks, and Members
  const loadInitialData = useCallback(async () => {
    setLoading(true);

    // 1. Resolve Project
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

    // 2. Fetch Stories, Tasks, and Members
    const [membersData, allTasks, allStories] = await Promise.all([
      fetchWorkspaceMembers(supabase),
      fetchWorkspaceTasks(supabase),
      fetchWorkspaceStories(supabase, currentProj?.id || projectId),
    ]);

    setMembers(membersData);

    // Resolve current Story
    const foundStory = allStories.find((s) => s.id === storyId);
    setStory(foundStory || null);
    if (foundStory) {
      setEditStoryTitle(foundStory.title);
      setEditStoryDescription(foundStory.description || "");
      setEditStoryPriority(foundStory.priority);
      setEditStoryStatus(foundStory.status);
      setEditStoryDueDate(foundStory.due_date ? foundStory.due_date.split("T")[0] : "");
    }

    // Filter tasks strictly belonging to this story
    const storyTasks = allTasks.filter((t) => t.story_id === storyId);
    setTasks(storyTasks);

    setLoading(false);
  }, [projectId, storyId, supabase]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Real-time synchronization for this story's tasks
  useEffect(() => {
    if (!supabase || !story) return;

    const channel = supabase
      .channel(`realtime-story-tasks-${story.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row?.story_id !== story.id && payload.eventType !== "DELETE") return;

          if (payload.eventType === "INSERT") {
            const mapped: Task = {
              id: payload.new.id,
              project_id: payload.new.project_id,
              story_id: payload.new.story_id,
              story_title: payload.new.story_title || story.title,
              project_name: payload.new.project_name || project?.name || "Project",
              title: payload.new.title,
              description: payload.new.description ?? "",
              descriptive_paths: Array.isArray(payload.new.descriptive_paths)
                ? payload.new.descriptive_paths
                : [],
              priority: (payload.new.priority || "medium") as TaskPriority,
              stage: (payload.new.stage as TaskStage) || mapStatusToStage(payload.new.status),
              assigned_to_id: payload.new.assigned_to_id || null,
              assigned_to_name: payload.new.assigned_to_name || null,
              assigned_to_role: payload.new.assigned_to_role || null,
              due_date: payload.new.due_date ? String(payload.new.due_date).split("T")[0] : "",
              created_at: payload.new.created_at || new Date().toISOString(),
              updated_at: payload.new.updated_at || new Date().toISOString(),
              syncedToSupabase: true,
            };

            setTasks((prev) => {
              if (prev.some((t) => t.id === mapped.id)) {
                return prev.map((t) => (t.id === mapped.id ? { ...t, ...mapped } : t));
              }
              return [mapped, ...prev];
            });
            showToast(`Task "${mapped.title}" synchronized from Supabase.`, "success");
          } else if (payload.eventType === "UPDATE") {
            const mappedUpdates: Partial<Task> = {
              title: payload.new.title,
              description: payload.new.description ?? "",
              descriptive_paths: Array.isArray(payload.new.descriptive_paths)
                ? payload.new.descriptive_paths
                : undefined,
              priority: (payload.new.priority || "medium") as TaskPriority,
              stage: (payload.new.stage as TaskStage) || mapStatusToStage(payload.new.status),
              assigned_to_id: payload.new.assigned_to_id || null,
              assigned_to_name: payload.new.assigned_to_name || null,
              assigned_to_role: payload.new.assigned_to_role || null,
              due_date: payload.new.due_date ? String(payload.new.due_date).split("T")[0] : "",
              updated_at: payload.new.updated_at || new Date().toISOString(),
              syncedToSupabase: true,
            };

            setTasks((prev) =>
              prev.map((t) => (t.id === payload.new.id ? { ...t, ...mappedUpdates } : t))
            );
            if (taskDetail?.id === payload.new.id) {
              setTaskDetail((prev) => (prev ? { ...prev, ...mappedUpdates } : null));
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setTasks((prev) => prev.filter((t) => t.id !== deletedId));
              if (taskDetail?.id === deletedId) {
                setTaskDetail(null);
              }
              showToast("A task was removed from Supabase.", "info");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, story, taskDetail?.id, project?.name]);

  // Escape key listener for modals & drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddModalOpen(false);
        setIsSqlModalOpen(false);
        setIsEditStoryModalOpen(false);
        setTaskDetail(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered Tasks for this Story
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesStage = selectedStageFilter === "All" || t.stage === selectedStageFilter;
      const matchesPriority =
        selectedPriorityFilter === "All" || t.priority === selectedPriorityFilter;
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

  // Dynamic Story Progress calculated from child tasks
  const storyProgress = useMemo(() => {
    if (!story) return 0;
    return computeStoryProgress(story.id, tasks);
  }, [story, tasks]);

  // Tasks grouped by Kanban stage
  const tasksByStage = useMemo(() => {
    const map: Record<TaskStage, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    filteredTasks.forEach((t) => {
      const stage = (t.stage in map ? t.stage : "todo") as TaskStage;
      map[stage].push(t);
    });
    return map;
  }, [filteredTasks]);

  // Handle stage change (optimistic update + Supabase sync)
  const handleStageChange = async (taskId: string, newStage: TaskStage) => {
    if (isViewer) {
      showToast("Viewers cannot move or edit tasks.", "error");
      return;
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, stage: newStage, updated_at: new Date().toISOString() } : t))
    );
    if (taskDetail?.id === taskId) {
      setTaskDetail((prev) => (prev ? { ...prev, stage: newStage } : null));
    }

    const updated = await updateWorkspaceTask(taskId, { stage: newStage }, supabase);
    const storyTasks = updated.filter((t) => t.story_id === storyId);
    setTasks(storyTasks);

    showToast(`Task moved to "${STAGE_CONFIG[newStage].label}". Story progress recalculated!`, "success");
  };

  // Handle priority change
  const handlePriorityChange = async (taskId: string, newPriority: TaskPriority) => {
    if (isViewer) {
      showToast("Viewers cannot change task priorities.", "error");
      return;
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t))
    );
    if (taskDetail?.id === taskId) {
      setTaskDetail((prev) => (prev ? { ...prev, priority: newPriority } : null));
    }
    const updated = await updateWorkspaceTask(taskId, { priority: newPriority }, supabase);
    setTasks(updated.filter((t) => t.story_id === storyId));
    showToast(`Priority set to "${newPriority}".`);
  };

  // Handle delete task
  const handleDeleteTask = async (taskId: string) => {
    if (isViewer) {
      showToast("Viewers cannot delete tasks.", "error");
      return;
    }
    const target = tasks.find((t) => t.id === taskId);
    const remaining = await deleteWorkspaceTask(taskId, supabase);
    setTasks(remaining.filter((t) => t.story_id === storyId));
    if (taskDetail?.id === taskId) {
      setTaskDetail(null);
    }
    showToast(`Task "${target?.title || "Task"}" deleted.`, "info");
  };

  // Handle Create Task under this Story
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddTask) {
      showToast("Only Admins, Managers, and Developers can add tasks.", "error");
      return;
    }
    if (!newTaskForm.title.trim() || !story || !project) return;

    const assignedMember = members.find((m) => m.id === newTaskForm.assigned_to_id);
    const paths = newTaskForm.descriptive_paths_text
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const created = await createWorkspaceTask(
      {
        project_id: project.id,
        project_name: project.name,
        story_id: story.id,
        story_title: story.title,
        title: newTaskForm.title.trim(),
        description: newTaskForm.description.trim(),
        descriptive_paths: paths,
        priority: newTaskForm.priority,
        stage: newTaskForm.stage,
        assigned_to_id: assignedMember ? assignedMember.id : null,
        assigned_to_name: assignedMember ? assignedMember.name : null,
        assigned_to_role: assignedMember ? assignedMember.role_title : null,
        due_date: newTaskForm.due_date,
      },
      supabase
    );

    setTasks((prev) => [created, ...prev]);
    setIsAddModalOpen(false);
    setNewTaskForm({
      title: "",
      description: "",
      assigned_to_id: "",
      priority: "medium",
      stage: "todo",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      descriptive_paths_text: "",
    });
    showToast(`Task "${created.title}" created under story "${story.title}".`, "success");
  };

  // Handle Save Task Details Drawer edits
  const handleSaveTaskDetails = async () => {
    if (!taskDetail || isViewer) return;
    const assignedMember = members.find((m) => m.id === editAssigneeId);
    const paths = editPathsText
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const updates: Partial<Task> = {
      title: editTitle.trim() || taskDetail.title,
      description: editDescription.trim(),
      descriptive_paths: paths,
      priority: editPriority,
      due_date: editDueDate,
      assigned_to_id: assignedMember ? assignedMember.id : null,
      assigned_to_name: assignedMember ? assignedMember.name : null,
      assigned_to_role: assignedMember ? assignedMember.role_title : null,
    };

    const updated = await updateWorkspaceTask(taskDetail.id, updates, supabase);
    setTasks(updated.filter((t) => t.story_id === storyId));
    setTaskDetail((prev) => (prev ? { ...prev, ...updates } : null));
    setIsEditingTaskInfo(false);
    showToast("Task details updated and synced.", "success");
  };

  // Handle Edit Story Metadata
  const handleSaveStoryEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditStory) {
      showToast("Only Admins and Managers can edit stories.", "error");
      return;
    }
    if (!story || !editStoryTitle.trim()) return;

    const updates: Partial<Story> = {
      title: editStoryTitle.trim(),
      description: editStoryDescription.trim(),
      priority: editStoryPriority,
      status: editStoryStatus,
      due_date: editStoryDueDate,
    };

    const { stories: updatedStories, tasks: updatedTasks } = await updateWorkspaceStory(
      story.id,
      updates,
      true, // cascades due date and priority to child tasks if changed
      supabase
    );

    const freshStory = updatedStories.find((s) => s.id === story.id);
    if (freshStory) setStory(freshStory);
    setTasks(updatedTasks.filter((t) => t.story_id === story.id));
    setIsEditStoryModalOpen(false);
    showToast(`Story "${editStoryTitle}" updated. Global changes cascaded to child tasks.`, "success");
  };

  // Loading View
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24">
        <OwlLoader
          size="lg"
          text="Buffering Story Tasks..."
          subtext="Loading Kanban board, owl avatars, and database records"
        />
      </div>
    );
  }

  // Not Found View
  if (!project || !story) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-white">Story Not Found</h1>
        <p className="mt-2 text-xs text-zinc-400">
          Could not resolve story &quot;{storyId}&quot; in project &quot;{projectId}&quot;.
        </p>
        <Link
          href={`/projects/${encodeURIComponent(projectId)}/stories`}
          className="mt-4 inline-block px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 shadow-sm transition active:scale-95"
        >
          &larr; Return to Project Stories
        </Link>
      </div>
    );
  }

  const storyStatusStyle = STORY_STATUS_CONFIG[story.status];
  const storyPriorityStyle = PRIORITY_CONFIG[story.priority];

  return (
    <div className="relative flex-1 flex flex-col mx-auto w-full max-w-7xl px-4 sm:px-8 py-8 animate-fade-in">
      {/* Ambient Executive Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-full max-w-4xl bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03),transparent_70%)] blur-2xl -z-10" />

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-2.5 text-xs shadow-2xl backdrop-blur-md animate-scale-up flex items-center gap-2 ${
            toastType === "error"
              ? "border-rose-500/40 bg-zinc-900/95 text-rose-200"
              : "border-zinc-700 bg-zinc-900/95 text-zinc-200"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              toastType === "error"
                ? "bg-rose-400"
                : "bg-emerald-400 animate-pulse"
            }`}
          />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ===== BREADCRUMB & BACK NAVIGATION ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 flex-wrap">
          <Link href="/projects" className="hover:text-zinc-200 transition flex items-center gap-1">
            <span>&larr; Projects</span>
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${encodeURIComponent(project.id)}/stories`}
            className="hover:text-zinc-200 transition truncate max-w-[160px] sm:max-w-xs"
          >
            {project.name}
          </Link>
          <span>/</span>
          <span className="text-zinc-200 font-bold truncate max-w-[180px] sm:max-w-xs">
            {story.title}
          </span>
          <span>/</span>
          <span className="text-zinc-300 font-semibold">Story Tasks</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-xs font-mono text-zinc-300 transition cursor-pointer"
            title="View 3-Table Supabase Schema (Projects -> Stories -> Tasks)"
          >
            <span>⚡</span>
            <span>Supabase 3-Table Schema</span>
          </button>
          <Link
            href={`/projects/${encodeURIComponent(project.id)}/stories`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900 text-xs text-zinc-400 hover:text-white transition"
          >
            <span>&larr;</span>
            <span>All Stories</span>
          </Link>
        </div>
      </div>

      {/* ===== STORY CONTEXT BANNER (Parent of these Tasks) ===== */}
      <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 relative overflow-hidden shadow-md">

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border border-zinc-700/80 bg-zinc-850 text-zinc-300">
                ACTIVE STORY
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono border ${storyStatusStyle.badge}`}>
                {storyStatusStyle.label}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono border ${storyPriorityStyle.badge}`}>
                {storyPriorityStyle.label} Priority
              </span>
              {story.due_date && (
                <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                  <span>📅 Due {formatDate(story.due_date)}</span>
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {story.title}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed font-light">
              {story.description || "No description provided for this story."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {canEditStory && (
              <button
                onClick={() => setIsEditStoryModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-200 transition cursor-pointer"
              >
                <span>Edit Story</span>
              </button>
            )}
            {canAddTask && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span>+ Add Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Story Progress Track Rollup */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 uppercase tracking-wider text-[11px]">
                Story Milestone Completion (from child tasks)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-400">
                {tasks.filter((t) => t.stage === "done").length} of {tasks.length} tasks completed
              </span>
              <span
                className="font-bold text-sm text-zinc-200"
              >
                {storyProgress}%
              </span>
            </div>
          </div>
          <div className="h-2.5 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${storyProgress}%`,
                background:
                  storyProgress === 100
                    ? "#10b981"
                    : `linear-gradient(90deg, rgba(255,255,255,0.7) 0%, var(--accent-color) 100%)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ===== ACTION BAR: SEARCH, FILTERS, VIEW SWITCHER & ADD TASK ===== */}
      <div className="mt-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: View Switcher (Kanban vs List) & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-zinc-800 text-white font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-zinc-800 text-white font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Table / List</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search tasks, assignees, paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-1.5 pl-9 text-xs text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 focus:outline-none"
            />
            <svg
              className="w-4 h-4 absolute left-3 top-2 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Right: Filters & Action Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Stage Filter */}
          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 focus:outline-none cursor-pointer"
          >
            <option value="All">All Stages</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="done">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 focus:outline-none cursor-pointer"
          >
            <option value="All">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={selectedAssigneeFilter}
            onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 focus:outline-none cursor-pointer"
          >
            <option value="All">All Assignees</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role_title})
              </option>
            ))}
          </select>

          {/* "+ Add Task" button */}
          {canAddTask && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <span>+ Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT: KANBAN BOARD OR LIST VIEW ===== */}
      <div className="mt-6">
        {filteredTasks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 p-12 text-center">
            <span className="text-3xl">📋</span>
            <h3 className="mt-2 text-sm font-bold text-white">No tasks under this story</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {searchQuery || selectedStageFilter !== "All" || selectedPriorityFilter !== "All"
                ? "No tasks match your current filter criteria."
                : "Add your first task to start tracking work for this story."}
            </p>
            {canAddTask && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 shadow-sm transition active:scale-95 cursor-pointer"
              >
                + Add First Task
              </button>
            )}
          </div>
        ) : viewMode === "kanban" ? (
          /* ===== KANBAN BOARD (4 STAGES) ===== */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(["todo", "in_progress", "review", "done"] as TaskStage[]).map((stage) => {
              const stageTasks = tasksByStage[stage];
              const conf = STAGE_CONFIG[stage];

              return (
                <div
                  key={stage}
                  className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3.5"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${conf.dot}`} />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {conf.label}
                      </span>
                    </div>
                    <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                      {stageTasks.length}
                    </span>
                  </div>

                  {/* Task Cards Stack */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                    {stageTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-850 p-6 text-center text-zinc-600 text-[11px]">
                        No tasks in {conf.label.toLowerCase()}
                      </div>
                    ) : (
                      stageTasks.map((task) => {
                        const prio = PRIORITY_CONFIG[task.priority];
                        const dueChip = task.due_date ? getDueChip(task.due_date, task.stage) : null;
                        const assignedMember = members.find((m) => m.id === task.assigned_to_id);

                        return (
                          <div
                            key={task.id}
                            onClick={() => openTaskDetail(task)}
                            className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/80 hover:bg-zinc-850/90 hover:border-zinc-700/90 p-4 transition-all shadow-md cursor-pointer"
                          >
                            {/* Card Top: Priority & Due Chip */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${prio.badge}`}>
                                {prio.label}
                              </span>
                              {dueChip && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${dueChip.style}`}>
                                  {dueChip.text}
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h4 className="text-xs font-bold text-white group-hover:text-zinc-100 transition-colors line-clamp-2">
                              {task.title}
                            </h4>

                            {/* Description preview */}
                            {task.description && (
                              <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            {/* Descriptive paths pill */}
                            {task.descriptive_paths && task.descriptive_paths.length > 0 && (
                              <div className="mt-2.5 flex items-center gap-1 text-[10px] font-mono text-zinc-500 truncate">
                                <span>📁</span>
                                <span className="truncate">{task.descriptive_paths[0]}</span>
                                {task.descriptive_paths.length > 1 && (
                                  <span className="text-zinc-600">
                                    +{task.descriptive_paths.length - 1}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Card Footer: Assignee Owl Avatar & Stage Mover */}
                            <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between">
                              {/* Assignee Avatar */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CuteOwlAvatar
                                  owlId={assignedMember?.owl_avatar || "avatar-1"}
                                  name={task.assigned_to_name || "Unassigned"}
                                  size="xs"
                                />
                                <span className="text-[10px] text-zinc-400 truncate max-w-[90px]">
                                  {task.assigned_to_name || "Unassigned"}
                                </span>
                              </div>

                              {/* Stage movement arrows (hidden for Viewers) */}
                              {!isViewer && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1"
                                >
                                  {stage !== "todo" && (
                                    <button
                                      onClick={() => {
                                        const prevStage: Record<TaskStage, TaskStage> = {
                                          done: "review",
                                          review: "in_progress",
                                          in_progress: "todo",
                                          todo: "todo",
                                        };
                                        handleStageChange(task.id, prevStage[stage]);
                                      }}
                                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] cursor-pointer"
                                      title="Move to previous stage"
                                    >
                                      &larr;
                                    </button>
                                  )}
                                  {stage !== "done" && (
                                    <button
                                      onClick={() => {
                                        const nextStage: Record<TaskStage, TaskStage> = {
                                          todo: "in_progress",
                                          in_progress: "review",
                                          review: "done",
                                          done: "done",
                                        };
                                        handleStageChange(task.id, nextStage[stage]);
                                      }}
                                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] cursor-pointer"
                                      title="Advance to next stage"
                                    >
                                      &rarr;
                                    </button>
                                  )}
                                </div>
                              )}
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
        ) : (
          /* ===== TABLE / LIST VIEW ===== */
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-950/60 font-mono text-zinc-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Task</th>
                    <th className="px-4 py-3.5">Stage</th>
                    <th className="px-4 py-3.5">Priority</th>
                    <th className="px-4 py-3.5">Assignee</th>
                    <th className="px-4 py-3.5">Due Date</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredTasks.map((task) => {
                    const prio = PRIORITY_CONFIG[task.priority];
                    const stageConf = STAGE_CONFIG[task.stage];
                    const assignedMember = members.find((m) => m.id === task.assigned_to_id);

                    return (
                      <tr
                        key={task.id}
                        onClick={() => openTaskDetail(task)}
                        className="hover:bg-zinc-850/50 transition cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-white hover:text-zinc-200 transition">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <select
                            disabled={isViewer}
                            value={task.stage}
                            onChange={(e) => handleStageChange(task.id, e.target.value as TaskStage)}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-mono ${isViewer ? "cursor-default opacity-80" : "cursor-pointer"} ${stageConf.badge}`}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">In Review</option>
                            <option value="done">Done</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${prio.badge}`}>
                            {prio.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <CuteOwlAvatar
                              owlId={assignedMember?.owl_avatar || "avatar-1"}
                              name={task.assigned_to_name || "Unassigned"}
                              size="xs"
                            />
                            <span className="text-zinc-300 text-xs">
                              {task.assigned_to_name || "Unassigned"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-400">
                          {formatDate(task.due_date)}
                        </td>
                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openTaskDetail(task)}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                            >
                              Details
                            </button>
                            {!isViewer && (
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                                title="Delete task"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TASK DETAIL SLIDE-OUT DRAWER ("View Page where we can view task details") */}
      {/* ========================================================================= */}
      {taskDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-xl bg-zinc-950 border-l border-zinc-800 h-full overflow-y-auto p-6 sm:p-8 flex flex-col shadow-2xl animate-slide-left relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono border border-zinc-700 bg-zinc-800 text-zinc-300 font-semibold">
                  TASK DETAILS
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  under story: {story.title}
                </span>
              </div>
              <button
                onClick={() => setTaskDetail(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                title="Close drawer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="mt-6 space-y-6 flex-1">
              {/* Title & Edit Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono uppercase text-zinc-500">Task Title</label>
                  {!isViewer && (
                    <button
                      onClick={() => setIsEditingTaskInfo(!isEditingTaskInfo)}
                      className="text-[11px] text-zinc-300 hover:text-white hover:underline cursor-pointer"
                    >
                      {isEditingTaskInfo ? "Cancel Editing" : "✎ Edit Details"}
                    </button>
                  )}
                </div>
                {isEditingTaskInfo ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-white leading-snug">{taskDetail.title}</h2>
                )}
              </div>

              {/* Status / Stage & Priority Row */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl border border-zinc-850 bg-zinc-900/60">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                    Stage
                  </label>
                  <select
                    disabled={isViewer}
                    value={taskDetail.stage}
                    onChange={(e) => handleStageChange(taskDetail.id, e.target.value as TaskStage)}
                    className={`w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 ${
                      isViewer ? "cursor-default opacity-80" : "cursor-pointer"
                    }`}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                    Priority
                  </label>
                  {isEditingTaskInfo ? (
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-xs font-mono border ${
                        PRIORITY_CONFIG[taskDetail.priority].badge
                      }`}
                    >
                      {PRIORITY_CONFIG[taskDetail.priority].label}
                    </span>
                  )}
                </div>
              </div>

              {/* Assignee & Due Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                    Assignee (Owl Avatar)
                  </label>
                  {isEditingTaskInfo ? (
                    <select
                      value={editAssigneeId}
                      onChange={(e) => setEditAssigneeId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role_title})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-xl border border-zinc-800 bg-zinc-900/60">
                      <CuteOwlAvatar
                        owlId={
                          members.find((m) => m.id === taskDetail.assigned_to_id)?.owl_avatar ||
                          "avatar-1"
                        }
                        name={taskDetail.assigned_to_name || "Unassigned"}
                        size="sm"
                      />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">
                          {taskDetail.assigned_to_name || "Unassigned"}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {taskDetail.assigned_to_role || "No role assigned"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                    Due Date
                  </label>
                  {isEditingTaskInfo ? (
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer"
                    />
                  ) : (
                    <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs font-mono text-zinc-300">
                      {formatDate(taskDetail.due_date)}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1.5">
                  Description
                </label>
                {isEditingTaskInfo ? (
                  <textarea
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Enter detailed task instructions..."
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 leading-relaxed"
                  />
                ) : (
                  <div className="p-4 rounded-2xl border border-zinc-850 bg-zinc-900/40 text-xs text-zinc-300 leading-relaxed font-light whitespace-pre-wrap">
                    {taskDetail.description || "No description provided."}
                  </div>
                )}
              </div>

              {/* Descriptive Paths (Files / Workflows) */}
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1.5">
                  Descriptive Code & Spec Paths
                </label>
                {isEditingTaskInfo ? (
                  <textarea
                    rows={3}
                    value={editPathsText}
                    onChange={(e) => setEditPathsText(e.target.value)}
                    placeholder="One path per line, e.g.:&#10;rag-pipeline/extraction/parser.py&#10;docs/specs/api.json"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                  />
                ) : (
                  <div className="space-y-1.5">
                    {taskDetail.descriptive_paths && taskDetail.descriptive_paths.length > 0 ? (
                      taskDetail.descriptive_paths.map((path, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-[11px] font-mono text-zinc-300"
                        >
                          <span className="text-zinc-500">📄</span>
                          <span className="truncate">{path}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-500 italic">No descriptive paths specified.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata & Timestamps */}
              <div className="pt-4 border-t border-zinc-850 text-[11px] font-mono text-zinc-500 space-y-1">
                <p>Task ID: {taskDetail.id}</p>
                <p>Parent Story: {story.title}</p>
                <p>Project: {project.name}</p>
                <p>Created: {new Date(taskDetail.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="mt-8 pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
              {!isViewer ? (
                <button
                  onClick={() => handleDeleteTask(taskDetail.id)}
                  className="px-3 py-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition cursor-pointer"
                >
                  Delete Task
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {isEditingTaskInfo && !isViewer ? (
                  <button
                    onClick={handleSaveTaskDetails}
                    className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => setTaskDetail(null)}
                    className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD TASK MODAL (Pre-linked to this Story) */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div
            className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white">+ Add Task to Story</h3>
                <p className="text-[11px] font-mono text-zinc-400 truncate max-w-sm mt-0.5">
                  Story: {story.title}
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Task Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement LangGraph Checkpoint Persistence..."
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe task scope, requirements, or acceptance criteria..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Priority</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) =>
                      setNewTaskForm({ ...newTaskForm, priority: e.target.value as TaskPriority })
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Initial Stage</label>
                  <select
                    value={newTaskForm.stage}
                    onChange={(e) =>
                      setNewTaskForm({ ...newTaskForm, stage: e.target.value as TaskStage })
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Assignee</label>
                  <select
                    value={newTaskForm.assigned_to_id}
                    onChange={(e) =>
                      setNewTaskForm({ ...newTaskForm, assigned_to_id: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer"
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
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskForm.due_date}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, due_date: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Descriptive Paths (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. backend/app/agent.py, docs/spec.md"
                  value={newTaskForm.descriptive_paths_text}
                  onChange={(e) =>
                    setNewTaskForm({ ...newTaskForm, descriptive_paths_text: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                />
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT STORY MODAL */}
      {/* ========================================================================= */}
      {isEditStoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div
            className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">Edit Story Details</h3>
              <button
                onClick={() => setIsEditStoryModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStoryEdits} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Story Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editStoryTitle}
                  onChange={(e) => setEditStoryTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editStoryDescription}
                  onChange={(e) => setEditStoryDescription(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Priority (Cascades)
                  </label>
                  <select
                    value={editStoryPriority}
                    onChange={(e) => setEditStoryPriority(e.target.value as StoryPriority)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Status</label>
                  <select
                    value={editStoryStatus}
                    onChange={(e) => setEditStoryStatus(e.target.value as StoryStatus)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Due Date (Cascades to child tasks)
                </label>
                <input
                  type="date"
                  value={editStoryDueDate}
                  onChange={(e) => setEditStoryDueDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 cursor-pointer"
                />
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditStoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  Save Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUPABASE 3-TABLE SCHEMA MODAL */}
      {/* ========================================================================= */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div
            className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl animate-scale-up max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white">⚡ Supabase 3-Table Schema</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Projects (Parent) &rarr; Stories (Child) &rarr; Tasks (Child)
                </p>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto">
              <pre className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                {SQL_SCHEMA_TEXT}
              </pre>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-zinc-500">
                Idempotent & ready to execute in Supabase SQL Editor
              </span>
              <button
                onClick={handleCopySql}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 shadow-sm transition active:scale-95 cursor-pointer"
              >
                {copiedSql ? "✓ Copied to Clipboard!" : "Copy SQL Script"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
