"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/AuthProvider";

/* ==========================================================================
 * Account Settings page  (route: /settings)
 *
 * Three simple things that really work:
 *   1. Profile   : change your name (your email is shown but cannot be changed)
 *   2. Password  : set a new password
 *   3. Sign out
 * ========================================================================== */

type Notice = { type: "success" | "error"; text: string } | null;

// "Alex Rivera" -> "AR"
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase() || "CW";
}

// "2026-10-08T10:00:00Z" -> "Oct 8, 2026"
function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Small green (success) or red (error) message under a form
function NoticeText({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      role="status"
      className={`text-xs ${notice.type === "success" ? "text-emerald-400" : "text-rose-400"}`}
    >
      {notice.text}
    </p>
  );
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user, isLoading, signOut, refreshSession } = useAuth();

  // Profile form
  const [fullName, setFullName] = useState<string>("");
  const [savingName, setSavingName] = useState<boolean>(false);
  const [nameNotice, setNameNotice] = useState<Notice>(null);

  // Password form
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [savingPassword, setSavingPassword] = useState<boolean>(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);

  // Fill the name box when the user is loaded
  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || "");
  }, [user]);

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Workspace Member";

  // ----- Save the name -----
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (!trimmed) {
      setNameNotice({ type: "error", text: "Please enter your name." });
      return;
    }

    setSavingName(true);
    setNameNotice(null);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
      if (error) {
        setNameNotice({ type: "error", text: error.message });
      } else {
        await refreshSession();
        setNameNotice({ type: "success", text: "Your name was updated." });
      }
    } catch {
      setNameNotice({ type: "error", text: "Something went wrong. Please try again." });
    }
    setSavingName(false);
  };

  // ----- Change the password -----
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordNotice({ type: "error", text: "The password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: "error", text: "The two passwords do not match." });
      return;
    }

    setSavingPassword(true);
    setPasswordNotice(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordNotice({ type: "error", text: error.message });
      } else {
        setNewPassword("");
        setConfirmPassword("");
        setPasswordNotice({ type: "success", text: "Your password was changed." });
      }
    } catch {
      setPasswordNotice({ type: "error", text: "Something went wrong. Please try again." });
    }
    setSavingPassword(false);
  };

  // ----- Sign out -----
  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  // ----- Preferences (saved in this browser) -----
  const [defaultView, setDefaultView] = useState<string>("grid");
  const [defaultSort, setDefaultSort] = useState<string>("newest");
  const [prefNotice, setPrefNotice] = useState<Notice>(null);

  // Read the saved preferences when the page opens
  useEffect(() => {
    try {
      setDefaultView(localStorage.getItem("cognitive_pref_view") === "list" ? "list" : "grid");
      const savedSort = localStorage.getItem("cognitive_pref_sort");
      if (savedSort && ["newest", "oldest", "name", "docs"].includes(savedSort)) {
        setDefaultSort(savedSort);
      }
    } catch {
      // Ignored: the defaults are used
    }
  }, []);

  const savePreference = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      setPrefNotice({ type: "success", text: "Saved. It applies the next time you open Projects." });
    } catch {
      setPrefNotice({ type: "error", text: "Could not save your preference in this browser." });
    }
  };

    // ----- Your data and devices -----
  const [dataNotice, setDataNotice] = useState<Notice>(null);
  const [devicesNotice, setDevicesNotice] = useState<Notice>(null);
  const [signingOutAll, setSigningOutAll] = useState<boolean>(false);

  // Download the projects saved in this browser as a .json file
  const handleExportProjects = () => {
    try {
      const saved = localStorage.getItem("cognitive_projects");
      const projects = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(projects) || projects.length === 0) {
        setDataNotice({
          type: "error",
          text: "There are no saved projects to export yet. Open the Projects page first.",
        });
        return;
      }
      const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "my-projects.json";
      link.click();
      URL.revokeObjectURL(url);
      setDataNotice({ type: "success", text: `Exported ${projects.length} project(s).` });
    } catch {
      setDataNotice({ type: "error", text: "Could not export your projects. Please try again." });
    }
  };

  // Remove the copy of the projects saved in this browser
  const handleClearSavedData = () => {
    if (
      !window.confirm(
        "Remove the project data saved in this browser? Projects that are saved in the database will load again next time."
      )
    ) {
      return;
    }
    try {
      localStorage.removeItem("cognitive_projects");
      setDataNotice({ type: "success", text: "Saved data removed from this browser." });
    } catch {
      setDataNotice({ type: "error", text: "Could not clear the saved data." });
    }
  };

  // Sign out on every device (including this one)
  const handleSignOutEverywhere = async () => {
    if (!window.confirm("Sign out from all devices, including this one?")) return;
    setSigningOutAll(true);
    setDevicesNotice(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        setDevicesNotice({ type: "error", text: error.message });
        setSigningOutAll(false);
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setDevicesNotice({ type: "error", text: "Something went wrong. Please try again." });
      setSigningOutAll(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none";
  const cardClass = "rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6";

  // 1. Still checking if the user is signed in
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">
        <div className="h-6 w-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  // 2. Not signed in
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-8">
        <div className={`${cardClass} text-center`}>
          <h1 className="text-lg font-bold text-white">Please sign in</h1>
          <p className="mt-1 text-xs text-zinc-400">
            You need to sign in to manage your account.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // 3. Signed in
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8">
      {/* Page title with avatar */}
      <div className="flex items-center gap-4 pb-6 border-b border-zinc-800">
        <div className="h-14 w-14 shrink-0 rounded-full bg-linear-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center text-lg font-bold text-white shadow-md">
          {getInitials(displayName)}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white">Account Settings</h1>
          <p className="truncate text-xs text-zinc-400">{user.email}</p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {/* Profile */}
        <form onSubmit={handleSaveName} className={`${cardClass} space-y-4`}>
          <div>
            <h2 className="text-sm font-bold text-white">Profile</h2>
            <p className="mt-0.5 text-xs text-zinc-500">This name is shown at the top of every page.</p>
          </div>

          <div>
            <label htmlFor="account-name" className="block text-xs font-semibold text-zinc-300 mb-1">
              Full name
            </label>
            <input
              id="account-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="account-email" className="block text-xs font-semibold text-zinc-300 mb-1">
              Email
            </label>
            <input
              id="account-email"
              type="email"
              value={user.email ?? ""}
              disabled
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-500 cursor-not-allowed"
            />
            <p className="mt-1 text-[10px] text-zinc-500">Your email cannot be changed here.</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <NoticeText notice={nameNotice} />
            <button
              type="submit"
              disabled={savingName}
              className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer"
            >
              {savingName ? "Saving..." : "Save name"}
            </button>
          </div>
        </form>

        {/* Password */}
        <form onSubmit={handleChangePassword} className={`${cardClass} space-y-4`}>
          <div>
            <h2 className="text-sm font-bold text-white">Password</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Choose a new password (at least 6 characters).</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold text-zinc-300 mb-1">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-semibold text-zinc-300 mb-1">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <NoticeText notice={passwordNotice} />
            <button
              type="submit"
              disabled={savingPassword}
              className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer"
            >
              {savingPassword ? "Saving..." : "Change password"}
            </button>
          </div>
        </form>
        {/* Preferences */}
        <div className={`${cardClass} space-y-4`}>
          <div>
            <h2 className="text-sm font-bold text-white">Preferences</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              How the Projects page looks when you open it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="pref-view" className="block text-xs font-semibold text-zinc-300 mb-1">
                Default view
              </label>
              <select
                id="pref-view"
                value={defaultView}
                onChange={(e) => {
                  setDefaultView(e.target.value);
                  savePreference("cognitive_pref_view", e.target.value);
                }}
                className={inputClass}
              >
                <option value="grid">Grid (3 cards per row)</option>
                <option value="list">List (1 card per row)</option>
              </select>
            </div>

            <div>
              <label htmlFor="pref-sort" className="block text-xs font-semibold text-zinc-300 mb-1">
                Default order
              </label>
              <select
                id="pref-sort"
                value={defaultSort}
                onChange={(e) => {
                  setDefaultSort(e.target.value);
                  savePreference("cognitive_pref_sort", e.target.value);
                }}
                className={inputClass}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A-Z</option>
                <option value="docs">Most documents</option>
              </select>
            </div>
          </div>

          <NoticeText notice={prefNotice} />
        </div>

        {/* Account details (read only) */}
        <div className={`${cardClass} space-y-3`}>
          <h2 className="text-sm font-bold text-white">Account details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Member since</p>
              <p className="mt-1 text-sm font-semibold text-white">{formatDate(user.created_at)}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Last sign-in</p>
              <p className="mt-1 text-sm font-semibold text-white">{formatDate(user.last_sign_in_at)}</p>
            </div>
          </div>
        </div>

        {/* Your data */}
        <div className={`${cardClass} space-y-4`}>
          <div>
            <h2 className="text-sm font-bold text-white">Your data</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Download a copy of your projects, or remove the copy saved in this browser.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportProjects}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
            >
              Export my projects
            </button>
            <button
              onClick={handleClearSavedData}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
            >
              Clear saved data
            </button>
          </div>
          <NoticeText notice={dataNotice} />
        </div>

        {/* Devices */}
        <div className={`${cardClass} space-y-3`}>
          <div>
            <h2 className="text-sm font-bold text-white">Devices</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Signed in on another computer or phone? Sign out everywhere to be safe.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <NoticeText notice={devicesNotice} />
            <button
              onClick={handleSignOutEverywhere}
              disabled={signingOutAll}
              className="ml-auto rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition cursor-pointer"
            >
              {signingOutAll ? "Signing out..." : "Sign out from all devices"}
            </button>
          </div>
        </div>
        {/* Sign out */}
        <div className={`${cardClass} flex items-center justify-between gap-4`}>
          <div>
            <h2 className="text-sm font-bold text-white">Sign out</h2>
            <p className="mt-0.5 text-xs text-zinc-500">You will need to sign in again to use the workspace.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="shrink-0 rounded-lg border border-rose-900/40 bg-rose-950/20 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}