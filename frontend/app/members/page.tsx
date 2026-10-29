"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useAccent } from "@/components/AccentColorProvider";
import { useUserAvatar } from "@/components/UserAvatarProvider";
import {
  Member,
  MemberRoleType,
  SystemRole,
  fetchWorkspaceMembers,
  addWorkspaceMember,
  deleteWorkspaceMember,
  updateUserRole,
  updateMemberAvatar,
  updateMemberBasicDetails,
  syncCurrentUserToMembers,
  simulateNewUserSignIn,
  isDefaultAdmin,
  canManageRoles,
  fetchWorkspaceTasks,
  getMembersLocal,
  getTasksLocal,
  Task,
  STAGE_CONFIG,
  PRIORITY_CONFIG,
} from "@/utils/workspaceData";
import { CuteOwlAvatar } from "@/components/CuteOwlAvatar";
import { OwlAvatarPicker } from "@/components/OwlAvatarPicker";
import { OwlLoader } from "@/components/OwlLoader";

function formatDate(iso?: string | null): string {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return formatDate(iso);
}

const ROLE_CONFIG: Record<
  SystemRole,
  { label: string; badge: string; icon: string; desc: string }
> = {
  Admin: {
    label: "Admin",
    badge: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-semibold",
    icon: "👑",
    desc: "Full administrative controls, project/story orchestration, and role assignment",
  },
  Manager: {
    label: "Manager",
    badge: "border-purple-500/30 bg-purple-500/10 text-purple-300 font-semibold",
    icon: "💼",
    desc: "Can create projects, stories, and tasks across team pipelines",
  },
  Developer: {
    label: "Developer",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300 font-semibold",
    icon: "💻",
    desc: "Can view projects & stories, add tasks, and execute engineering workflows",
  },
  Viewer: {
    label: "Viewer",
    badge: "border-zinc-700 bg-zinc-800 text-zinc-300",
    icon: "👁️",
    desc: "Read-only access to view projects, stories, tasks, and members",
  },
};

export default function MembersPage() {
  const supabase = createClient();
  const { user: authUser } = useAuth();
  const { accentColor } = useAccent();

  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setMembers(getMembersLocal());
    setTasks(getTasksLocal());
  }, []);

  // Filters & Search
  const [roleFilter, setRoleFilter] = useState<"all" | SystemRole | "manager" | "developer">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Master-Detail Side Drawer State
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<"overview" | "tasks" | "activity">("overview");

  // Profile Details Edit State
  const [isEditingDetails, setIsEditingDetails] = useState<boolean>(false);
  const [detailsForm, setDetailsForm] = useState({
    name: "",
    role_title: "",
    department: "",
    skills: "",
    bio: "",
  });
  const [savingDetails, setSavingDetails] = useState<boolean>(false);

  // Role Assignment State
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [roleChangeNotice, setRoleChangeNotice] = useState<string | null>(null);

  // Avatar Picker State & Global Synchronization
  const { avatarId: currentUserAvatar, setAvatarId: setCurrentUserAvatar } = useUserAvatar();
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState<boolean>(false);
  const [avatarPickerTarget, setAvatarPickerTarget] = useState<"current_user" | "drawer_member">("current_user");

  // Modals & User Feedback
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Member Form Data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role_type: "developer" as MemberRoleType,
    system_role: "Developer" as SystemRole,
    role_title: "",
    department: "Engineering",
    skills: "",
    bio: "",
    avatar_color: "from-blue-600 to-cyan-500",
    owl_avatar: "avatar-1",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAvatarSelect = async (newOwlId: string) => {
    if (avatarPickerTarget === "current_user") {
      setCurrentUserAvatar(newOwlId);
      if (authUser) {
        setMembers((prev) =>
          prev.map((m) =>
            m.email.toLowerCase() === authUser.email?.toLowerCase() || m.id === authUser.id
              ? { ...m, owl_avatar: newOwlId }
              : m
          )
        );
        const userMember = members.find(
          (m) => m.email.toLowerCase() === authUser.email?.toLowerCase() || m.id === authUser.id
        );
        if (userMember) {
          await updateMemberAvatar(userMember.id, newOwlId, supabase);
        }
      }
      showToast("Updated your profile avatar! Active across all views.");
    } else if (avatarPickerTarget === "drawer_member" && activeMember) {
      const updated = await updateMemberAvatar(activeMember.id, newOwlId, supabase);
      if (updated) {
        setActiveMember(updated);
        setMembers((prev) => prev.map((m) => (m.id === activeMember.id ? updated : m)));
        if (
          authUser &&
          (activeMember.email.toLowerCase() === authUser.email?.toLowerCase() ||
            activeMember.id === authUser.id)
        ) {
          setCurrentUserAvatar(newOwlId);
        }
        showToast(`Updated avatar for ${activeMember.name}`);
      }
    }
    setIsAvatarPickerOpen(false);
  };

  // 1. Initial Load of Members & Tasks
  useEffect(() => {
    async function loadData() {
      // If we don't have members yet, show loader; otherwise background revalidate without flash
      if (members.length === 0) setLoading(true);
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

  // 2. Real-time Member Synchronization on Sign-in (Task 4)
  useEffect(() => {
    if (authUser && members.length > 0) {
      const { updatedList, newlyAdded } = syncCurrentUserToMembers(authUser, members);
      if (newlyAdded) {
        setMembers(updatedList);
        showToast(`Signed-in user "${newlyAdded.name}" synchronized into members roster.`);
      }
    }
  }, [authUser, members]);

  // 3. Supabase Realtime Live Sync: Listen for remote INSERT, UPDATE, DELETE on public.members
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("members-realtime-auth-sync")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "members" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newMem = payload.new as Member;
            setMembers((prev) => {
              if (prev.some((m) => m.id === newMem.id || (m.email && m.email.toLowerCase() === newMem.email?.toLowerCase()))) {
                return prev.map((m) =>
                  m.id === newMem.id || (m.email && m.email.toLowerCase() === newMem.email?.toLowerCase())
                    ? { ...m, ...newMem }
                    : m
                );
              }
              return [newMem, ...prev];
            });
            showToast(`New member "${newMem.name}" synchronized from Supabase Auth.`);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Member;
            setMembers((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
            setActiveMember((curr) => (curr && curr.id === updated.id ? { ...curr, ...updated } : curr));
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setMembers((prev) => prev.filter((m) => m.id !== deletedId));
              setActiveMember((curr) => {
                if (curr && curr.id === deletedId) {
                  setIsDrawerOpen(false);
                  return null;
                }
                return curr;
              });
              showToast("Member removed from workspace and Supabase Auth.");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Keyboard shortcut: Escape closes drawer and modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Derive current user member & permissions
  const currentUserMember = useMemo(() => {
    if (authUser?.email) {
      return (
        members.find(
          (m) =>
            (m.email && m.email.toLowerCase() === authUser.email?.toLowerCase()) ||
            m.id === authUser.id
        ) || null
      );
    }
    // Fallback: Default to Rama Rao (Admin) or default admin if not logged in
    return members.find((m) => isDefaultAdmin(m.name, m.email)) || members[0] || null;
  }, [authUser, members]);

  const currentUserRole: SystemRole = (currentUserMember?.system_role as SystemRole) || "Admin";
  const isCurrentAdmin = currentUserRole === "Admin";

  // Open member details drawer
  const handleOpenDrawer = (member: Member) => {
    setActiveMember(member);
    setIsDrawerOpen(true);
    setDrawerTab("overview");
    setIsEditingDetails(false);
    setDetailsForm({
      name: member.name,
      role_title: member.role_title,
      department: member.department,
      skills: (member.skills || []).join(", "),
      bio: member.bio || "",
    });
  };

  // Close drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setIsEditingDetails(false);
  };

  // Basic Profile Details Saving
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;
    setSavingDetails(true);

    try {
      const skillsArr = detailsForm.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const updated = await updateMemberBasicDetails(
        activeMember.id,
        {
          name: detailsForm.name,
          role_title: detailsForm.role_title,
          department: detailsForm.department,
          bio: detailsForm.bio,
          skills: skillsArr,
        },
        supabase
      );

      if (updated) {
        setActiveMember(updated);
        setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setIsEditingDetails(false);
        showToast(`Profile details updated for ${updated.name}`);
      }
    } catch {
      showToast("Error saving profile details");
    } finally {
      setSavingDetails(false);
    }
  };

  // Interactive Role Assignment (Admins Only)
  const handleRoleChange = async (newRole: SystemRole) => {
    if (!activeMember) return;
    if (!isCurrentAdmin) {
      showToast("Only Workspace Admins can modify user roles.");
      return;
    }
    const memberId = activeMember.id;
    setUpdatingRoleId(memberId);
    setRoleChangeNotice(`Dispatching role change to ${newRole}...`);

    try {
      const result = await updateUserRole(memberId, newRole, supabase);

      if (result.success && result.updatedMember) {
        const updated = result.updatedMember;
        setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
        setActiveMember(updated);
        showToast(`Role for ${updated.name} updated to ${newRole}`);
        setRoleChangeNotice(`Successfully assigned ${newRole} privilege.`);
        setTimeout(() => setRoleChangeNotice(null), 3000);
      }
    } catch {
      showToast("Failed to update user role");
      setRoleChangeNotice("Error updating user role.");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  // Simulate New User Sign-In
  const handleSimulateSignIn = () => {
    const newUser = simulateNewUserSignIn();
    setMembers((prev) => [newUser, ...prev]);
    showToast(`Simulated SSO Sign-In: ${newUser.name} added to roster.`);
    handleOpenDrawer(newUser);
  };

  // Add Member Submission
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
          system_role: formData.system_role,
          role_title:
            formData.role_title.trim() ||
            (formData.role_type === "manager"
              ? "Engineering Manager"
              : "Software Developer"),
          department: formData.department.trim() || "Core Platform",
          avatar_color: formData.avatar_color,
          owl_avatar: formData.owl_avatar || "owl-gold",
          status: "online",
          skills: skillsArray.length > 0 ? skillsArray : ["AI Systems", "TypeScript"],
          assigned_projects: ["Financial Document Intelligence"],
          bio: formData.bio.trim() || "Active contributor to Cognitive Workspace pipelines.",
          joined_date: new Date().toISOString(),
          activity_log: [
            {
              id: `act-${Date.now().toString(36)}`,
              action: "Member account provisioned",
              timestamp: new Date().toISOString(),
              details: "Directly added by administrator.",
            },
          ],
        },
        supabase
      );

      setMembers((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setFormData({
        name: "",
        email: "",
        role_type: "developer",
        system_role: "Developer",
        role_title: "",
        department: "Engineering",
        skills: "",
        bio: "",
        avatar_color: "from-blue-600 to-cyan-500",
        owl_avatar: "avatar-1",
      });
      showToast(`Member "${created.name}" added successfully.`);
      handleOpenDrawer(created);
    } catch {
      showToast("Error saving team member.");
    } finally {
      setSubmitting(false);
    }
  };

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

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const currentSysRole = m.system_role || "Member";
      const matchesRole =
        roleFilter === "all" ||
        currentSysRole === roleFilter ||
        m.role_type === roleFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.role_title.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        (m.skills && m.skills.some((s) => s.toLowerCase().includes(q))) ||
        currentSysRole.toLowerCase().includes(q);

      return matchesRole && matchesSearch;
    });
  }, [members, roleFilter, searchQuery]);

  // Tasks for the active member in drawer
  const activeMemberTasks = useMemo(() => {
    if (!activeMember) return [];
    return (
      memberTasksMap[activeMember.id] ||
      memberTasksMap[activeMember.name] ||
      []
    );
  }, [activeMember, memberTasksMap]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-zinc-900/95 px-4 py-3 text-xs font-semibold text-emerald-400 shadow-2xl backdrop-blur-md animate-scale-up">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-0.5 text-xs font-mono font-medium mb-2 text-zinc-300"
          >
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"
            />
            <span>Workspace Talent Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Team Members
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400 font-light">
            Streamlined roster with master-detail side drawer, instant role privilege assignment, and live sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Simulate Sign-in Trigger (Task 4) */}
          <button
            type="button"
            onClick={handleSimulateSignIn}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700/80 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition cursor-pointer hover:border-zinc-600"
            title="Simulate a real-time authentication event to test instant roster sync"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Simulate User Sign-In</span>
          </button>

          {/* Add Member Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-zinc-100 hover:bg-white px-4 py-2 text-xs font-semibold text-zinc-950 shadow-sm transition cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 text-zinc-950 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Total Members</p>
          <p suppressHydrationWarning className="mt-1 text-2xl font-bold text-white">{members.length}</p>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-indigo-400">Admins</p>
          <p suppressHydrationWarning className="mt-1 text-2xl font-bold text-indigo-300">
            {members.filter((m) => m.system_role === "Admin").length}
          </p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-purple-400">Managers</p>
          <p suppressHydrationWarning className="mt-1 text-2xl font-bold text-purple-300">
            {members.filter((m) => m.system_role === "Manager").length}
          </p>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-sky-400">Developers & Viewers</p>
          <p className="mt-1 text-2xl font-bold text-sky-300">
            {members.filter((m) => m.system_role === "Developer" || m.system_role === "Viewer").length}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Role Filters */}
        <div className="flex items-center flex-wrap gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 text-xs">
          {(["all", "Admin", "Manager", "Developer", "Viewer"] as const).map((r) => {
            const isSelected = roleFilter === r;
            const count =
              r === "all"
                ? members.length
                : members.filter((m) => (m.system_role || "Developer") === r).length;

            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                style={
                  isSelected
                    ? {
                        backgroundColor: "var(--accent-subtle)",
                        borderColor: "var(--accent-border)",
                        color: "#ffffff",
                      }
                    : undefined
                }
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer border ${
                  isSelected
                    ? "font-semibold shadow-xs"
                    : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <span>{r === "all" ? "All Members" : r}</span>
                <span className="ml-1.5 text-[10px] font-mono opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by name, role, email, skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2 pl-9 text-xs text-white placeholder-zinc-500 focus:border-[var(--accent-color)] focus:outline-none"
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

      {/* ============================================================ */}
      {/* TASK 1: CLEAN ON-PAGE MEMBERS MASTER LIST */}
      {/* ============================================================ */}
      <div className="mt-6">
        {loading ? (
          <div className="py-16">
            <OwlLoader text="Buffering workspace talent roster..." size="md" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center text-xs text-zinc-500">
            No members matching your search or role filter.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Member Name & Identity</th>
                    <th className="py-3.5 px-4">System Role</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Technical Domain</th>
                    <th className="py-3.5 px-4 hidden lg:table-cell">Department</th>
                    <th className="py-3.5 px-4 text-center">Assigned Tasks</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredMembers.map((member) => {
                    const assignedTasks =
                      memberTasksMap[member.id] || memberTasksMap[member.name] || [];
                    const activeTasksCount = assignedTasks.filter(
                      (t) => t.stage === "in_progress"
                    ).length;
                    const systemRole: SystemRole =
                      (member.system_role as SystemRole) ||
                      (member.role_type === "manager" ? "Manager" : "Developer");
                    const roleConfig = ROLE_CONFIG[systemRole] || ROLE_CONFIG.Developer;
                    const isSelected = activeMember?.id === member.id && isDrawerOpen;

                    return (
                      <tr
                        key={member.id}
                        onClick={() => handleOpenDrawer(member)}
                        className={`group transition cursor-pointer ${
                          isSelected
                            ? "bg-zinc-800/70"
                            : "hover:bg-zinc-850/50"
                        }`}
                      >
                        {/* 1. Name & Owl Avatar */}
                        <td className="py-3.5 px-4 sm:px-6">
                          {(() => {
                            const isCurrentUser =
                              authUser &&
                              (member.email.toLowerCase() === authUser.email?.toLowerCase() || member.id === authUser.id);
                            const displayedAvatar = isCurrentUser ? currentUserAvatar : (member.owl_avatar || "avatar-1");

                            return (
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  <div className="group-hover:scale-105 transition-transform">
                                    <CuteOwlAvatar
                                      owlId={displayedAvatar}
                                      name={member.name}
                                      size="md"
                                    />
                                  </div>
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 ${
                                      member.status === "online"
                                        ? "bg-emerald-400"
                                        : member.status === "away"
                                        ? "bg-amber-400"
                                        : "bg-zinc-500"
                                    }`}
                                    title={`Status: ${member.status}`}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-white group-hover:text-[var(--accent-text)] transition-colors truncate">
                                      {member.name}
                                    </p>
                                    {isCurrentUser && (
                                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold border border-zinc-700 bg-zinc-800 text-zinc-300">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-zinc-400 font-mono truncate">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* 2. System Role Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono border ${roleConfig.badge}`}
                          >
                            <span>{roleConfig.icon}</span>
                            <span>{systemRole}</span>
                          </span>
                        </td>

                        {/* 3. Role Title */}
                        <td className="py-3.5 px-4 hidden md:table-cell text-zinc-300 truncate max-w-xs">
                          {member.role_title}
                        </td>

                        {/* 4. Department */}
                        <td className="py-3.5 px-4 hidden lg:table-cell text-zinc-400">
                          <span className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 font-mono text-[10px]">
                            {member.department}
                          </span>
                        </td>

                        {/* 5. Assigned Tasks */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1 font-mono text-xs">
                            <span className="text-white font-bold">{assignedTasks.length}</span>
                            {activeTasksCount > 0 && (
                              <span className="text-[10px] text-sky-400">
                                ({activeTasksCount} active)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Quick Action / Open Drawer Trigger */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDrawer(member);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 group-hover:text-white transition"
                          >
                            <span>View</span>
                            <span className="text-[10px]">&rarr;</span>
                          </button>
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

      {/* ============================================================ */}
      {/* TASK 1 & TASK 4: STREAMLINED SIDE DRAWER (MASTER-DETAIL) */}
      {/* ============================================================ */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity duration-300"
          onClick={handleCloseDrawer}
          aria-modal="true"
          role="dialog"
          aria-labelledby="member-drawer-title"
        >
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-screen max-w-md sm:max-w-xl bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col justify-between animate-slide-in-right overflow-hidden"
            >
              {/* Drawer Top Bar */}
              <div className="p-6 border-b border-zinc-800 bg-zinc-950">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {/* Owl Avatar */}
                    <div
                      onClick={() => {
                        setAvatarPickerTarget("drawer_member");
                        setIsAvatarPickerOpen(true);
                      }}
                      className="relative shrink-0 group cursor-pointer"
                      title="Click to change this member's owl avatar"
                    >
                      <div className="group-hover:scale-105 transition-transform">
                        <CuteOwlAvatar
                          owlId={
                            authUser &&
                            (activeMember?.email.toLowerCase() === authUser.email?.toLowerCase() ||
                              activeMember?.id === authUser.id)
                              ? currentUserAvatar
                              : activeMember?.owl_avatar
                          }
                          name={activeMember?.name}
                          size="xl"
                        />
                      </div>
                      <div className="absolute inset-0 rounded-full bg-black/65 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity backdrop-blur-[1px]">
                        <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[9px] font-bold uppercase tracking-wider">Change</span>
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 ${
                          activeMember?.status === "online"
                            ? "bg-emerald-400"
                            : activeMember?.status === "away"
                            ? "bg-amber-400"
                            : "bg-zinc-500"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <h2
                        id="member-drawer-title"
                        className="text-lg font-bold text-white truncate"
                      >
                        {activeMember?.name}
                      </h2>
                      <p className="text-xs text-zinc-400 font-mono truncate">
                        {activeMember?.email}
                      </p>
                      <p className="text-xs text-zinc-300 mt-0.5">
                        {activeMember?.role_title} &bull; {activeMember?.department}
                      </p>

                      {/* Avatar Change Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarPickerTarget("drawer_member");
                          setIsAvatarPickerOpen(true);
                        }}
                        style={{
                          backgroundColor: "var(--accent-subtle)",
                          borderColor: "var(--accent-border)",
                          color: "var(--accent-text)",
                        }}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:opacity-90 active:scale-95 transition cursor-pointer shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>Change Avatar</span>
                      </button>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={handleCloseDrawer}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                    aria-label="Close details drawer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* ============================================================ */}
                {/* ROLE ASSIGNMENT DROPDOWN & PRIVILEGES */}
                {/* ============================================================ */}
                <div className="mt-5 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label
                        htmlFor="role-assignment-select"
                        className="block text-xs font-semibold text-zinc-200"
                      >
                        Assign System Role & Privileges
                      </label>
                      <p className="text-[11px] text-zinc-400">
                        {activeMember ? ROLE_CONFIG[activeMember.system_role || "Developer"].desc : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {updatingRoleId && (
                        <div
                          className="h-4 w-4 rounded-full border-2 border-transparent animate-spin"
                          style={{
                            borderTopColor: "var(--accent-color)",
                            borderRightColor: "var(--accent-color)",
                          }}
                        />
                      )}
                      <select
                        id="role-assignment-select"
                        value={activeMember?.system_role || "Developer"}
                        disabled={!isCurrentAdmin || updatingRoleId !== null}
                        onChange={(e) => handleRoleChange(e.target.value as SystemRole)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium focus:border-[var(--accent-color)] focus:outline-none ${
                          isCurrentAdmin
                            ? "border-zinc-700 bg-zinc-900 text-white cursor-pointer"
                            : "border-zinc-800 bg-zinc-950 text-zinc-500 cursor-not-allowed opacity-80"
                        }`}
                      >
                        <option value="Admin">👑 Admin</option>
                        <option value="Manager">💼 Manager</option>
                        <option value="Developer">💻 Developer</option>
                        <option value="Viewer">👁️ Viewer</option>
                      </select>
                    </div>
                  </div>

                  {!isCurrentAdmin && (
                    <p className="mt-2 text-[10px] font-mono text-amber-400/90 flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>Role modification restricted to Workspace Admins. You can change your avatar and details below.</span>
                    </p>
                  )}

                  {roleChangeNotice && (
                    <p className="mt-2 text-[11px] font-mono text-emerald-400">
                      ✓ {roleChangeNotice}
                    </p>
                  )}
                </div>

                {/* Drawer Tab Navigation */}
                <div className="mt-5 flex items-center gap-2 border-b border-zinc-800 -mb-6 pb-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDrawerTab("overview")}
                    className={`pb-2 px-1 font-medium transition cursor-pointer border-b-2 ${
                      drawerTab === "overview"
                        ? "border-[var(--accent-color)] text-white font-bold"
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Overview & Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab("tasks")}
                    className={`pb-2 px-1 font-medium transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
                      drawerTab === "tasks"
                        ? "border-[var(--accent-color)] text-white font-bold"
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span>Assigned Tasks</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800">
                      {activeMemberTasks.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab("activity")}
                    className={`pb-2 px-1 font-medium transition cursor-pointer border-b-2 ${
                      drawerTab === "activity"
                        ? "border-[var(--accent-color)] text-white font-bold"
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Activity Log
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {drawerTab === "overview" && activeMember && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Header with Edit Button */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        Profile & Core Information
                      </span>
                      {(isCurrentAdmin || (currentUserMember && currentUserMember.id === activeMember.id)) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!isEditingDetails) {
                              setDetailsForm({
                                name: activeMember.name,
                                role_title: activeMember.role_title,
                                department: activeMember.department,
                                skills: (activeMember.skills || []).join(", "),
                                bio: activeMember.bio || "",
                              });
                            }
                            setIsEditingDetails(!isEditingDetails);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>{isEditingDetails ? "Cancel Editing" : "Edit Basic Details"}</span>
                        </button>
                      )}
                    </div>

                    {isEditingDetails ? (
                      <form onSubmit={handleSaveDetails} className="space-y-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/80">
                        <div>
                          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            value={detailsForm.name}
                            onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Role Title</label>
                            <input
                              type="text"
                              required
                              value={detailsForm.role_title}
                              onChange={(e) => setDetailsForm({ ...detailsForm, role_title: e.target.value })}
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Department</label>
                            <input
                              type="text"
                              required
                              value={detailsForm.department}
                              onChange={(e) => setDetailsForm({ ...detailsForm, department: e.target.value })}
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Skills (comma-separated)</label>
                          <input
                            type="text"
                            value={detailsForm.skills}
                            onChange={(e) => setDetailsForm({ ...detailsForm, skills: e.target.value })}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Bio / Domain Focus</label>
                          <textarea
                            rows={3}
                            value={detailsForm.bio}
                            onChange={(e) => setDetailsForm({ ...detailsForm, bio: e.target.value })}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none resize-none"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setIsEditingDetails(false)}
                            className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingDetails}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 active:scale-95 disabled:opacity-50 transition cursor-pointer shadow-sm"
                          >
                            {savingDetails ? "Saving..." : "Save Details"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {/* Bio / About */}
                        <div>
                          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                            About & Domain Focus
                          </h3>
                          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 text-xs text-zinc-300 leading-relaxed">
                            {activeMember.bio || "No extended biography provided for this member."}
                          </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
                            <span className="text-zinc-500 text-[10px] block">Joined Date</span>
                            <span className="text-zinc-200 font-semibold mt-0.5 block">
                              {formatDate(activeMember.joined_date || activeMember.created_at)}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
                            <span className="text-zinc-500 text-[10px] block">Role Classification</span>
                            <span className="text-zinc-200 font-semibold mt-0.5 block capitalize">
                              {activeMember.role_type}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
                            <span className="text-zinc-500 text-[10px] block">Department</span>
                            <span className="text-zinc-200 font-semibold mt-0.5 block">
                              {activeMember.department}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
                            <span className="text-zinc-500 text-[10px] block">Member Identifier</span>
                            <span className="text-zinc-200 font-semibold mt-0.5 block truncate">
                              {activeMember.id}
                            </span>
                          </div>
                        </div>

                        {/* Skills & Domain Competencies */}
                        <div>
                          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                            Core Competencies & Toolchains
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {activeMember.skills && activeMember.skills.length > 0 ? (
                              activeMember.skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-mono text-zinc-300"
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-zinc-500 font-mono">No skills listed.</span>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Assigned Projects */}
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                        Assigned Project Portfolios
                      </h3>
                      <div className="space-y-2">
                        {activeMember.assigned_projects && activeMember.assigned_projects.length > 0 ? (
                          activeMember.assigned_projects.map((proj) => (
                            <div
                              key={proj}
                              className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs"
                            >
                              <span className="font-semibold text-white">{proj}</span>
                              <Link
                                href="/projects"
                                className="text-[11px] text-zinc-400 hover:text-white transition"
                              >
                                View Project &rarr;
                              </Link>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 text-xs text-zinc-500">
                            No active project portfolios assigned.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Actions: Remove Member */}
                    {isCurrentAdmin && activeMember.id !== currentUserMember?.id && (
                      <div className="pt-4 border-t border-zinc-800/80">
                        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-rose-300">Remove from Workspace</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                              Removes this member from the workspace roster and synchronizes deletion with Supabase Auth.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to remove "${activeMember.name}" from the workspace directory and Supabase?`)) {
                                await deleteWorkspaceMember(activeMember.id, supabase);
                                setMembers((prev) => prev.filter((m) => m.id !== activeMember.id));
                                setIsDrawerOpen(false);
                                setActiveMember(null);
                                showToast(`Removed "${activeMember.name}" from workspace.`);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/20 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition active:scale-95 shrink-0"
                          >
                            Remove Member
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tasks Tab */}
                {drawerTab === "tasks" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs">
                      <span className="text-zinc-400 font-mono uppercase text-[10px]">
                        Active Task Portfolio ({activeMemberTasks.length})
                      </span>
                      <Link
                        href="/projects"
                        className="text-[11px] text-zinc-400 hover:text-white transition"
                      >
                        All Tasks &rarr;
                      </Link>
                    </div>

                    {activeMemberTasks.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-xl">
                        No active tasks currently assigned to {activeMember?.name}.
                      </div>
                    ) : (
                      activeMemberTasks.map((t) => {
                        const stageConf = STAGE_CONFIG[t.stage];
                        const priorityConf = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;

                        return (
                          <div
                            key={t.id}
                            className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                                  {t.project_name}
                                </span>
                                <h4 className="text-xs font-bold text-white mt-0.5">{t.title}</h4>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${stageConf.badge}`}>
                                  {stageConf.label}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${priorityConf.badge}`}>
                                  {priorityConf.label}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-zinc-300 leading-relaxed">{t.description}</p>

                            {t.descriptive_paths && t.descriptive_paths.length > 0 && (
                              <div className="pt-2 border-t border-zinc-850 flex flex-wrap gap-1">
                                {t.descriptive_paths.map((p) => (
                                  <span
                                    key={p}
                                    className="px-1.5 py-0.2 rounded border border-zinc-800 bg-zinc-900 font-mono text-[9px] text-emerald-400"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                              <span>Due: {formatDate(t.due_date)}</span>
                              <span>ID: {t.id}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Activity Log Tab */}
                {drawerTab === "activity" && activeMember && (
                  <div className="space-y-3 animate-fade-in">
                    <span className="text-zinc-400 font-mono uppercase text-[10px] block pb-2 border-b border-zinc-800">
                      Audit Timeline & Session Events
                    </span>

                    {activeMember.activity_log && activeMember.activity_log.length > 0 ? (
                      <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                        {activeMember.activity_log.map((act) => (
                          <div key={act.id} className="relative text-xs">
                            <span className="absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full border-2 border-zinc-900 bg-zinc-400" />
                            <p className="font-semibold text-white">{act.action}</p>
                            {act.details && <p className="text-zinc-400 text-[11px] mt-0.5">{act.details}</p>}
                            <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                              {formatRelativeTime(act.timestamp)} &bull; {formatDate(act.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-zinc-500 text-xs font-mono">
                        No recorded activity logs for this member yet.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drawer Bottom Bar */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">
                  Esc to close drawer
                </span>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Done
                </button>
              </div>
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
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--accent-subtle)",
                    borderColor: "var(--accent-border)",
                    color: "var(--accent-text)",
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-white">Add Team Member</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mt-5 space-y-4">
              {/* Cute Owl Avatar Selection */}
              <OwlAvatarPicker
                selected={formData.owl_avatar}
                onSelect={(id) => setFormData({ ...formData, owl_avatar: id })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Blake"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="jordan.blake@cognitive.ai"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    System Role Access
                  </label>
                  <select
                    value={formData.system_role}
                    onChange={(e) =>
                      setFormData({ ...formData, system_role: e.target.value as SystemRole })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                  >
                    <option value="Admin">👑 Admin</option>
                    <option value="Manager">💼 Manager</option>
                    <option value="Developer">💻 Developer</option>
                    <option value="Viewer">👁️ Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Domain Role Type
                  </label>
                  <select
                    value={formData.role_type}
                    onChange={(e) =>
                      setFormData({ ...formData, role_type: e.target.value as MemberRoleType })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                  >
                    <option value="developer">Developer / Engineer</option>
                    <option value="manager">Manager / Technical Lead</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Role Title & Specialization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior LangGraph Engineer"
                  value={formData.role_title}
                  onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Agent Development"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="LangGraph, pgvector, Python, FastAPI"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Brief Bio
                </label>
                <textarea
                  rows={2}
                  placeholder="Key areas of technical ownership and project focus..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Assigned Owl Avatar
                </label>
                <div className="flex items-center gap-3">
                  <div className="shrink-0 p-1 rounded-full border border-zinc-700 bg-black">
                    <CuteOwlAvatar owlId={formData.owl_avatar} size="md" />
                  </div>
                  <select
                    value={formData.owl_avatar}
                    onChange={(e) => setFormData({ ...formData, owl_avatar: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-[var(--accent-color)] focus:outline-none"
                  >
                    <option value="avatar-1">🦉 Avatar 1 - Classic Scholar</option>
                    <option value="avatar-2">🦉 Avatar 2 - Detective Inspector</option>
                    <option value="avatar-3">🦉 Avatar 3 - Spring Bonnet</option>
                    <option value="avatar-4">🦉 Avatar 4 - Cool Shutter</option>
                    <option value="avatar-5">🦉 Avatar 5 - Retro Afro</option>
                    <option value="avatar-6">🦉 Avatar 6 - Pink Bow Lavender</option>
                    <option value="avatar-7">🦉 Avatar 7 - Zombie Monster</option>
                    <option value="avatar-8">🦉 Avatar 8 - Cybernetic Mecha</option>
                    <option value="avatar-9">🦉 Avatar 9 - Pirate Buccaneer</option>
                    <option value="avatar-10">🦉 Avatar 10 - Bandana Cowboy</option>
                    <option value="avatar-11">🦉 Avatar 11 - Mystic Wizard</option>
                    <option value="avatar-12">🦉 Avatar 12 - Flower Crown</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {submitting ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12 Collectible Owl Avatar Picker Modal */}
      <OwlAvatarPicker
        isModal={true}
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        selectedOwlId={
          activeMember
            ? authUser &&
              (activeMember.email.toLowerCase() === authUser.email?.toLowerCase() ||
                activeMember.id === authUser.id)
              ? currentUserAvatar
              : activeMember.owl_avatar || "avatar-1"
            : currentUserAvatar
        }
        onSelect={handleAvatarSelect}
        title={activeMember ? `Choose Owl Avatar for ${activeMember.name}` : "Choose Your Profile Owl Avatar"}
      />
    </div>
  );
}
