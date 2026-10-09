"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  Member,
  MemberRoleType,
  fetchWorkspaceMembers,
  addWorkspaceMember,
  fetchWorkspaceTasks,
  Task,
  STAGE_CONFIG,
  PRIORITY_CONFIG,
} from "@/utils/workspaceData";

function formatDate(iso: string): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MembersPage() {
  const supabase = createClient();

  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<"all" | "manager" | "developer">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedMemberForTasks, setSelectedMemberForTasks] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role_type: "developer" as MemberRoleType,
    role_title: "",
    department: "Engineering",
    skills: "",
    avatar_color: "from-blue-600 to-cyan-500",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [membersData, tasksData] = await Promise.all([
        fetchWorkspaceMembers(supabase),
        fetchWorkspaceTasks(supabase),
      ]);
      setMembers(membersData);
      setTasks(tasksData);
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  // Esc key closes modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddModalOpen(false);
        setSelectedMemberForTasks(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Map tasks per member
  const memberTasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (t.assigned_to_id) {
        if (!map[t.assigned_to_id]) map[t.assigned_to_id] = [];
        map[t.assigned_to_id].push(t);
      }
      if (t.assigned_to_name) {
        if (!map[t.assigned_to_name]) map[t.assigned_to_name] = [];
        map[t.assigned_to_name].push(t);
      }
    }
    return map;
  }, [tasks]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesRole =
        selectedRoleFilter === "all" || m.role_type === selectedRoleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.role_title.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.skills.some((s) => s.toLowerCase().includes(q));
      return matchesRole && matchesSearch;
    });
  }, [members, selectedRoleFilter, searchQuery]);

  const managersList = useMemo(
    () => filteredMembers.filter((m) => m.role_type === "manager"),
    [filteredMembers]
  );

  const developersList = useMemo(
    () => filteredMembers.filter((m) => m.role_type === "developer"),
    [filteredMembers]
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setSubmitting(true);
    try {
      const skillsArray = formData.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await addWorkspaceMember(
        {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role_type: formData.role_type,
          role_title:
            formData.role_title.trim() ||
            (formData.role_type === "manager"
              ? "Engineering Manager"
              : "Software Developer"),
          department: formData.department.trim() || "Core Platform",
          avatar_color: formData.avatar_color,
          status: "online",
          skills: skillsArray.length > 0 ? skillsArray : ["Fullstack", "AI Agents"],
          assigned_projects: ["Financial Document Intelligence"],
        },
        supabase
      );

      setMembers((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setFormData({
        name: "",
        email: "",
        role_type: "developer",
        role_title: "",
        department: "Engineering",
        skills: "",
        avatar_color: "from-blue-600 to-cyan-500",
      });
      showToast(`Member "${created.name}" added successfully.`);
    } catch {
      showToast("Error saving team member.");
    } finally {
      setSubmitting(false);
    }
  };

  const AVATAR_GRADIENTS = [
    { label: "Blue / Cyan", value: "from-blue-600 to-cyan-500" },
    { label: "Emerald / Teal", value: "from-emerald-500 to-teal-600" },
    { label: "Indigo / Violet", value: "from-indigo-600 to-purple-600" },
    { label: "Amber / Rose", value: "from-amber-500 to-rose-600" },
    { label: "Pink / Red", value: "from-pink-500 to-red-600" },
    { label: "Sky / Indigo", value: "from-sky-500 to-indigo-500" },
  ];

  const currentMemberTasks = useMemo(() => {
    if (!selectedMemberForTasks) return [];
    return (
      memberTasksMap[selectedMemberForTasks.id] ||
      memberTasksMap[selectedMemberForTasks.name] ||
      []
    );
  }, [selectedMemberForTasks, memberTasksMap]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-zinc-900/95 px-4 py-3 text-xs font-semibold text-emerald-400 shadow-2xl backdrop-blur-md animate-scale-up">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-mono font-medium text-emerald-300 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Workspace Talent Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Team Members
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Click any member name to inspect their read-only assigned task details and progress status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition"
          >
            <span>&larr; Projects Hub</span>
          </Link>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Total Members</p>
          <p className="mt-1 text-2xl font-bold text-white">{members.length}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400">Managers & Leads</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">
            {members.filter((m) => m.role_type === "manager").length}
          </p>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-sky-400">Developers & Engineers</p>
          <p className="mt-1 text-2xl font-bold text-sky-300">
            {members.filter((m) => m.role_type === "developer").length}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">Active Tasks</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{tasks.length}</p>
        </div>
      </div>

      {/* Controls: Search & Role Filter Tabs */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Role Tabs */}
        <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 text-xs">
          <button
            onClick={() => setSelectedRoleFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              selectedRoleFilter === "all"
                ? "bg-zinc-800 text-white shadow-xs font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All Members ({members.length})
          </button>
          <button
            onClick={() => setSelectedRoleFilter("manager")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              selectedRoleFilter === "manager"
                ? "bg-amber-500/20 text-amber-300 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>👑 Managers</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/10">
              {members.filter((m) => m.role_type === "manager").length}
            </span>
          </button>
          <button
            onClick={() => setSelectedRoleFilter("developer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              selectedRoleFilter === "developer"
                ? "bg-sky-500/20 text-sky-300 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>⚡ Developers</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-sky-500/10">
              {members.filter((m) => m.role_type === "developer").length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by name, role, skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2 pl-9 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <svg
            className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="mt-12 flex flex-col items-center justify-center py-16 text-zinc-500">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="mt-3 text-xs font-mono">Loading workspace team members...</p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {/* SECTION 1: MANAGERS & LEADERSHIP */}
          {(selectedRoleFilter === "all" || selectedRoleFilter === "manager") && (
            <div>
              <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-zinc-800/80">
                <span className="text-lg">👑</span>
                <h2 className="text-base font-bold text-white tracking-wide">
                  Managers & Technical Leadership
                </h2>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                  {managersList.length} {managersList.length === 1 ? "Leader" : "Leaders"}
                </span>
              </div>

              {managersList.length === 0 ? (
                <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/30 text-center text-xs text-zinc-500">
                  No managers matching the search filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {managersList.map((member) => {
                    const assignedTasks =
                      memberTasksMap[member.id] || memberTasksMap[member.name] || [];
                    const inProgressTasks = assignedTasks.filter((t) => t.stage === "in_progress").length;

                    return (
                      <div
                        key={member.id}
                        onClick={() => setSelectedMemberForTasks(member)}
                        className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-amber-500/50 hover:bg-zinc-900/95 transition-all shadow-md cursor-pointer"
                        title="Click to view assigned tasks and status details"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div
                                  className={`h-12 w-12 rounded-xl bg-linear-to-tr ${member.avatar_color} flex items-center justify-center text-sm font-bold text-white shadow-md`}
                                >
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                                <span
                                  className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-zinc-900 ${
                                    member.status === "online"
                                      ? "bg-emerald-400"
                                      : member.status === "away"
                                      ? "bg-yellow-400"
                                      : "bg-zinc-500"
                                  }`}
                                  title={`Status: ${member.status}`}
                                />
                              </div>

                              <div>
                                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                                  <span>{member.name}</span>
                                </h3>
                                <p className="text-xs text-zinc-400">{member.role_title}</p>
                              </div>
                            </div>

                            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-amber-300">
                              Manager
                            </span>
                          </div>

                          <div className="mt-4 space-y-1 text-xs font-mono text-zinc-400">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-zinc-500">Email:</span>
                              <span className="text-zinc-300">{member.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500">Dept:</span>
                              <span className="text-zinc-300">{member.department}</span>
                            </div>
                          </div>

                          <div className="mt-4">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
                              Leadership Domain
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {member.skills.map((s) => (
                                <span
                                  key={s}
                                  className="rounded border border-zinc-800 bg-zinc-950/70 px-2 py-0.5 text-[10px] font-mono text-zinc-400"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Bar: Read-only Task Status Indicator */}
                        <div className="mt-5 pt-3.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400">
                            <strong className="text-white font-bold">{assignedTasks.length}</strong> tasks assigned
                            {inProgressTasks > 0 && (
                              <span className="ml-1 text-amber-300 text-[10px]">({inProgressTasks} active)</span>
                            )}
                          </span>

                          <span className="text-[11px] font-semibold text-amber-400 group-hover:underline flex items-center gap-1">
                            <span>View Task Status</span>
                            <span>&rarr;</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: DEVELOPERS & ENGINEERS */}
          {(selectedRoleFilter === "all" || selectedRoleFilter === "developer") && (
            <div>
              <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-zinc-800/80">
                <span className="text-lg">⚡</span>
                <h2 className="text-base font-bold text-white tracking-wide">
                  Developers & Engineering Specialists
                </h2>
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono text-sky-300">
                  {developersList.length} {developersList.length === 1 ? "Engineer" : "Engineers"}
                </span>
              </div>

              {developersList.length === 0 ? (
                <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/30 text-center text-xs text-zinc-500">
                  No developers matching the search filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {developersList.map((member) => {
                    const assignedTasks =
                      memberTasksMap[member.id] || memberTasksMap[member.name] || [];
                    const inProgressTasks = assignedTasks.filter((t) => t.stage === "in_progress").length;

                    return (
                      <div
                        key={member.id}
                        onClick={() => setSelectedMemberForTasks(member)}
                        className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-sky-500/50 hover:bg-zinc-900/95 transition-all shadow-md cursor-pointer"
                        title="Click to view assigned tasks and status details"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div
                                  className={`h-12 w-12 rounded-xl bg-linear-to-tr ${member.avatar_color} flex items-center justify-center text-sm font-bold text-white shadow-md`}
                                >
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                                <span
                                  className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-zinc-900 ${
                                    member.status === "online"
                                      ? "bg-emerald-400"
                                      : member.status === "away"
                                      ? "bg-yellow-400"
                                      : "bg-zinc-500"
                                  }`}
                                  title={`Status: ${member.status}`}
                                />
                              </div>

                              <div>
                                <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors flex items-center gap-1.5">
                                  <span>{member.name}</span>
                                </h3>
                                <p className="text-xs text-zinc-400">{member.role_title}</p>
                              </div>
                            </div>

                            <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-sky-300">
                              Developer
                            </span>
                          </div>

                          <div className="mt-4 space-y-1 text-xs font-mono text-zinc-400">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-zinc-500">Email:</span>
                              <span className="text-zinc-300">{member.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500">Dept:</span>
                              <span className="text-zinc-300">{member.department}</span>
                            </div>
                          </div>

                          <div className="mt-4">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
                              Tech Stack & Modules
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {member.skills.map((s) => (
                                <span
                                  key={s}
                                  className="rounded border border-zinc-800 bg-zinc-950/70 px-2 py-0.5 text-[10px] font-mono text-zinc-400"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Bar: Read-only Task Status Indicator */}
                        <div className="mt-5 pt-3.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400">
                            <strong className="text-white font-bold">{assignedTasks.length}</strong> tasks assigned
                            {inProgressTasks > 0 && (
                              <span className="ml-1 text-sky-300 text-[10px]">({inProgressTasks} active)</span>
                            )}
                          </span>

                          <span className="text-[11px] font-semibold text-sky-400 group-hover:underline flex items-center gap-1">
                            <span>View Task Status</span>
                            <span>&rarr;</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW-ONLY MODAL: TASK DETAILS FOR MEMBER (ON CLICKING NAME) */}
      {/* ============================================================ */}
      {selectedMemberForTasks && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setSelectedMemberForTasks(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Tasks assigned to ${selectedMemberForTasks.name}`}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Member Profile */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div
                  className={`h-12 w-12 rounded-xl bg-linear-to-tr ${selectedMemberForTasks.avatar_color} flex items-center justify-center text-sm font-bold text-white shadow-md`}
                >
                  {selectedMemberForTasks.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{selectedMemberForTasks.name}</h2>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        selectedMemberForTasks.role_type === "manager"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border-sky-500/30 bg-sky-500/10 text-sky-300"
                      }`}
                    >
                      {selectedMemberForTasks.role_type === "manager" ? "Manager / Lead" : "Developer"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{selectedMemberForTasks.role_title} &bull; {selectedMemberForTasks.department}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMemberForTasks(null)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Subheader banner */}
            <div className="mt-4 flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950/70 text-xs font-mono">
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Assigned Task Portfolio (View-Only)</span>
              </div>
              <span className="text-zinc-400">
                {currentMemberTasks.length} {currentMemberTasks.length === 1 ? "task" : "tasks"} on record
              </span>
            </div>

            {/* List View of Tasks */}
            <div className="mt-4 space-y-3">
              {currentMemberTasks.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-xl">
                  No active tasks currently assigned to {selectedMemberForTasks.name}.
                </div>
              ) : (
                currentMemberTasks.map((t) => {
                  const stageConf = STAGE_CONFIG[t.stage];
                  const priorityConf = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;

                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 space-y-2.5"
                    >
                      {/* Top Row: Title + Project + Stage */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 block mb-0.5">
                            {t.project_name}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {t.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-mono ${stageConf.badge}`}
                          >
                            Status: {stageConf.label}
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-mono ${priorityConf.badge}`}
                          >
                            {priorityConf.label}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {t.description}
                      </p>

                      {/* Descriptive Paths Box (Read-only) */}
                      {t.descriptive_paths && t.descriptive_paths.length > 0 && (
                        <div className="pt-2 border-t border-zinc-850">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                            Descriptive Implementation Paths & Targets:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {t.descriptive_paths.map((p) => (
                              <span
                                key={p}
                                className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-emerald-400/90"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Due Date */}
                      <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <span>Due Date: <strong className="text-zinc-200">{formatDate(t.due_date)}</strong></span>
                        <span className="text-zinc-500">ID: {t.id}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Done button */}
            <div className="mt-6 pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedMemberForTasks(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD MEMBER MODAL */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add Workspace Member"
            className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-white">Add Team Member</h2>
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

            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Role Classification *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role_type: "manager" })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      formData.role_type === "manager"
                        ? "border-amber-500/60 bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <span>👑 Manager / Lead</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role_type: "developer" })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      formData.role_type === "developer"
                        ? "border-sky-500/60 bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <span>⚡ Developer / Engineer</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Liam Sterling"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. liam@cognitive.ai"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    placeholder={
                      formData.role_type === "manager"
                        ? "e.g. Technical Director"
                        : "e.g. Senior Backend Dev"
                    }
                    value={formData.role_title}
                    onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AI Systems"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Skills & Expertise (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. LangGraph, Python, Architecture, React"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Avatar Theme
                </label>
                <select
                  value={formData.avatar_color}
                  onChange={(e) => setFormData({ ...formData, avatar_color: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  {AVATAR_GRADIENTS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
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
                    <span>Add Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
