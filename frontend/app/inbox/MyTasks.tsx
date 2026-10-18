"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import {
  Task,
  Member,
  STAGE_CONFIG,
  PRIORITY_CONFIG,
  fetchWorkspaceTasks,
  fetchWorkspaceMembers,
} from "@/utils/workspaceData";

const VIEW_KEY = "cognitive_inbox_viewing_as";

function dueInfo(task: Task) {
  if (!task.due_date) return { label: "No due date", tone: "text-zinc-500" };
  const today = new Date().toISOString().split("T")[0];
  if (task.stage !== "done" && task.due_date < today) {
    return { label: `Overdue · ${task.due_date}`, tone: "text-rose-400 font-semibold" };
  }
  if (task.stage !== "done" && task.due_date === today) {
    return { label: "Due today", tone: "text-amber-300 font-semibold" };
  }
  return { label: `Due ${task.due_date}`, tone: "text-zinc-400" };
}

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [memberId, setMemberId] = useState<string>("");

  // Load tasks and members
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const [taskList, memberList] = await Promise.all([
          fetchWorkspaceTasks(supabase),
          fetchWorkspaceMembers(supabase),
        ]);
        if (!active) return;
        setTasks(taskList);
        setMembers(memberList);
      } catch {
        // keep the page usable with empty lists
      }
      if (active) setLoaded(true);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Decide which member we are viewing as
  useEffect(() => {
    if (members.length === 0) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(VIEW_KEY);
    } catch {
      // ignore
    }
    const savedOk = saved && members.some((m) => m.id === saved) ? saved : null;
    const email = user?.email?.toLowerCase();
    const matched = email ? members.find((m) => m.email.toLowerCase() === email) : undefined;
    setMemberId(savedOk ?? matched?.id ?? members[0].id);
  }, [members, user]);

  const chooseMember = (id: string) => {
    setMemberId(id);
    try {
      localStorage.setItem(VIEW_KEY, id);
    } catch {
      // ignore
    }
  };

  const myTasks = tasks
    .filter((t) => t.assigned_to_id === memberId)
    .sort((a, b) => {
      if ((a.stage === "done") !== (b.stage === "done")) return a.stage === "done" ? 1 : -1;
      return (a.due_date || "9999").localeCompare(b.due_date || "9999");
    });

  const openCount = myTasks.filter((t) => t.stage !== "done").length;
  const doneCount = myTasks.length - openCount;

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <div className="h-7 w-7 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <p className="mt-3 text-xs font-mono">Loading your tasks...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Viewing as */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="flex items-center gap-2">
          <label htmlFor="viewing-as" className="text-xs text-zinc-400">
            Viewing as
          </label>
          <select
            id="viewing-as"
            value={memberId}
            onChange={(e) => chooseMember(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-zinc-400">
          {openCount} open · {doneCount} done
        </p>
      </div>

      {/* Task list */}
      <div className="mt-3">
        {myTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
            <p className="text-sm font-semibold text-zinc-300">No tasks assigned</p>
            <p className="mt-1 text-xs text-zinc-500">
              Tasks assigned to this member will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {myTasks.map((task) => {
              const stage = STAGE_CONFIG[task.stage] ?? STAGE_CONFIG.todo;
              const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
              const due = dueInfo(task);
              return (
                <li key={task.id}>
                  <Link
                    href={`/projects/${task.project_id}/tasks`}
                    className={`block rounded-xl border p-4 transition hover:bg-zinc-900 ${stage.border} ${stage.bg}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-sm ${
                          task.stage === "done" ? "text-zinc-400 line-through" : "font-semibold text-white"
                        }`}
                      >
                        {task.title}
                      </p>
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-mono ${stage.badge}`}>
                        {stage.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{task.project_name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                      <span className={`rounded border px-1.5 py-0.5 font-mono ${priority.badge}`}>
                        {priority.label}
                      </span>
                      <span className={due.tone}>{due.label}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}