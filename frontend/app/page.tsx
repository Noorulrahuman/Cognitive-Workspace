"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CuteOwlAvatar } from "@/components/CuteOwlAvatar";
import { useAccent } from "@/components/AccentColorProvider";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Member, fetchWorkspaceMembers, syncCurrentUserToMembers } from "@/utils/workspaceData";

export const dynamic = "force-dynamic";

const QUICK_PAGES = [
  {
    title: "Projects & Portfolios",
    subtitle: "Active Workspaces",
    badge: "Core",
    href: "/projects",
    icon: "📂",
    desc: "Track roadmaps, dual progress metrics, and workspace initiatives.",
  },
  {
    title: "User Stories & Tasks",
    subtitle: "Hierarchy Board",
    badge: "New",
    href: "/projects/proj-1/stories",
    icon: "📜",
    desc: "Stories nested with tasks, global cascade due dates & live progress sync.",
  },
  {
    title: "Owl Talent Roster",
    subtitle: "Team Directory",
    badge: "Synced",
    href: "/members",
    icon: "🦉",
    desc: "Master-detail roster with cute owl avatars, roles & real-time sync.",
  },
  {
    title: "Gemini Copilot",
    subtitle: "Agentic Chat",
    badge: "AI 1.5",
    href: "/chat",
    icon: "✨",
    desc: "Ground reasoning loops with pgvector semantic evidence citations.",
  },
];

const FEATURES = [
  {
    title: "Gemini Agentic Workflows",
    tag: "LangGraph & Gemini",
    desc: "Autonomous cognitive loops coordinating dense multi-document retrieval, recursive reasoning, and automated task dispatch.",
    icon: "✦",
    tagColor: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  },
  {
    title: "Hierarchical Stories & Tasks",
    tag: "Projects → Stories → Tasks",
    desc: "Cascade due dates and priorities globally across child tasks, with automatic dual-tier progress rollups.",
    icon: "◈",
    tagColor: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  {
    title: "Owl Talent & Avatar System",
    tag: "Cute Owl Identity",
    desc: "Personalize workspace members with custom cute owl avatars, real-time SSO sync, and role privileges.",
    icon: "🦉",
    tagColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
];

const SYSTEM_METRICS = [
  { label: "Active Cognitive Nodes", value: "8 Agents", detail: "LangGraph state cycles" },
  { label: "Story Hierarchy Sync", value: "Real-time", detail: "Projects → Stories → Tasks" },
  { label: "Vector Search Latency", value: "<18ms", detail: "HNSW indexed pgvector" },
  { label: "Progress Auto-Rollup", value: "100% Live", detail: "Weighted completion sync" },
];

export default function Home() {
  const { accentColor } = useAccent();
  const supabase = createClient();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadMembers() {
      let data = await fetchWorkspaceMembers(supabase);
      if (user) {
        const { updatedList } = syncCurrentUserToMembers(user, data, supabase);
        data = updatedList;
      }
      if (mounted) {
        setMembers(data);
        setLoadingMembers(false);
      }
    }
    loadMembers();
    return () => {
      mounted = false;
    };
  }, [user, supabase]);

  return (
    <div className="flex-1 flex flex-col justify-between relative overflow-hidden">
      {/* Clean subtle dot matrix background texture without hue wash */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16 text-center">
        {/* ============================================================ */}
        {/* QUICK NAVIGATION HUB (CARDS RETAINED, LOGO REMOVED FROM PAGE) */}
        {/* ============================================================ */}
        <section
          aria-label="Workspace Quick Navigation Hub"
          className="w-full max-w-5xl mb-12 animate-fade-in"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
            {QUICK_PAGES.map((page) => (
              <Link
                key={page.title}
                href={page.href}
                className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 text-left backdrop-blur-md shadow-lg transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/90 hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl group-hover:scale-110 transition-transform">{page.icon}</span>
                  <span
                    className="px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/90 font-mono text-[9px] font-semibold text-zinc-300"
                  >
                    {page.badge}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  {page.title}
                </h3>
                <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {page.desc}
                </p>
                <div className="mt-3 flex items-center text-[10px] font-mono text-zinc-500 group-hover:text-amber-400 transition-colors">
                  <span>Enter page</span>
                  <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Live Status Pill Badge */}
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3.5 py-1 text-xs font-mono font-medium text-zinc-300 backdrop-blur-md"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>AI-Powered Cognitive Architecture & Live Stories Pipeline</span>
        </div>

        {/* Hero Title with Previous Clean Font Typography & Gradient Accent */}
        <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl text-white">
          Smarter Context. <br />
          <span
            className="bg-clip-text text-transparent transition-all duration-700 animate-shimmer"
            style={{
              backgroundImage: `linear-gradient(135deg, #ffffff 0%, var(--accent-text, #fde68a) 25%, var(--accent-color, #f59e0b) 60%, #d97706 100%)`,
            }}
          >
            Autonomous Stories & Tasks.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-300 font-light">
          Cognitive Workspace organizes parent projects into actionable user stories and child tasks,
          featuring global cascade updates, dual-tier progress rollups, and cute owl member avatars.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/projects"
            className="flex h-12 items-center justify-center rounded-xl bg-zinc-100 hover:bg-white px-7 text-sm font-semibold text-zinc-950 shadow-sm transition hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <span>Explore Projects & Stories &rarr;</span>
          </Link>

          <Link
            href="/members"
            className="flex h-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/90 px-6 text-sm font-semibold text-zinc-200 transition hover:border-[var(--accent-color)] hover:bg-zinc-800 hover:text-white hover:scale-[1.02] cursor-pointer"
          >
            <span className="mr-2">🦉</span>
            <span>Owl Member Roster</span>
          </Link>

          <Link
            href="/chat"
            className="flex h-12 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-6 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white hover:scale-[1.02] cursor-pointer"
          >
            <span className="mr-2">✨</span>
            <span>Launch Gemini</span>
          </Link>
        </div>

        {/* System Architecture Metrics Ticker */}
        <div className="mt-14 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
          {SYSTEM_METRICS.map((metric) => (
            <div
              key={metric.label}
              className="p-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/40 backdrop-blur-md hover:border-[var(--accent-border)] hover:bg-zinc-900/70 transition-all duration-300"
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{metric.label}</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-white">{metric.value}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{metric.detail}</p>
            </div>
          ))}
        </div>

        {/* Team Snapshot Preview (Featuring Cute Owl Avatars) */}
        <div className="mt-8 w-full max-w-4xl rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-6 text-left shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Synchronized Owl Talent Directory
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Roster with cute owl avatar identities, slide-out profile drawers, and live role privileges
              </p>
            </div>
            <Link
              href="/members"
              style={{ color: "var(--accent-text)" }}
              className="text-xs font-semibold hover:underline transition flex items-center gap-1.5"
            >
              <span>Explore All Members</span>
              <span>&rarr;</span>
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {loadingMembers ? (
              <div className="col-span-full py-8 text-center text-xs font-mono text-zinc-500">
                Loading registered members...
              </div>
            ) : members.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs font-mono text-zinc-500">
                No registered members found. Sign in to join the roster!
              </div>
            ) : (
              members.slice(0, 8).map((member) => (
                <Link
                  key={member.id}
                  href="/members"
                  className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/70 bg-zinc-950/70 hover:border-[var(--accent-border)] hover:bg-zinc-900/90 transition group cursor-pointer"
                >
                  <div className="shrink-0 group-hover:scale-105 transition-transform">
                    <CuteOwlAvatar owlId={member.owl_avatar || "avatar-1"} name={member.name} size="md" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-100 truncate group-hover:text-[var(--accent-text)] transition-colors">
                      {member.name}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">{member.role_title}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-zinc-700/60 bg-zinc-800/70 text-zinc-300"
                      >
                        {member.system_role || (member.role_type === "manager" ? "Manager" : "Developer")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Feature Bento Grid */}
        <div className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((item) => (
            <div
              key={item.title}
              className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md transition-all hover:border-[var(--accent-border)] hover:bg-zinc-900/80 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] ${item.tagColor}`}>
                  {item.tag}
                </span>
                <span className="text-zinc-500 font-mono text-xs">{item.icon}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-100 group-hover:text-[var(--accent-text)] transition-colors">
                {item.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400 font-light">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900/80 px-6 py-6 text-center text-xs text-zinc-500">
        <p>Cognitive Workspace &bull; Unified Agentic Intelligence & Story Pipeline</p>
      </footer>
    </div>
  );
}