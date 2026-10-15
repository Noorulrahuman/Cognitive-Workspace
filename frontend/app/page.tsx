"use client";

import Link from "next/link";
import AnimatedLogo from "@/components/AnimatedLogo";
import { useAccent } from "@/components/AccentColorProvider";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Gemini Agentic Workflows",
    tag: "LangGraph & Gemini",
    desc: "Autonomous cognitive loops coordinating dense multi-document retrieval, recursive reasoning, and automated task dispatch.",
    icon: "✦",
    tagColor: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  },
  {
    title: "Semantic Vector Grounding",
    tag: "pgvector & Supabase",
    desc: "High-density cosine vector embeddings ensuring strict factual evidence citations with zero hallucination drift.",
    icon: "◈",
    tagColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  {
    title: "Dynamic Team & Task Board",
    tag: "Master-Detail Synergy",
    desc: "Streamlined talent rosters, role privilege assignments, and automated task stages across managers and developers.",
    icon: "⬡",
    tagColor: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
];

const PREVIEW_MEMBERS = [
  { name: "Dr. Sarah Chen", role: "Head of Cognitive Architecture", systemRole: "Admin", color: "from-amber-500 to-rose-600" },
  { name: "Marcus Vance", role: "Product & Delivery Lead", systemRole: "Admin", color: "from-indigo-600 to-purple-600" },
  { name: "Alex Rivera", role: "Senior LangGraph Engineer", systemRole: "Editor", color: "from-blue-600 to-cyan-500" },
  { name: "Priya Sharma", role: "Fullstack Next.js Engineer", systemRole: "Member", color: "from-emerald-500 to-teal-600" },
];

const SYSTEM_METRICS = [
  { label: "Active Cognitive Nodes", value: "8 Agents", detail: "LangGraph state cycles" },
  { label: "Talent Roster Sync", value: "Real-time", detail: "Instant member onboarding" },
  { label: "Vector Search Latency", value: "<18ms", detail: "HNSW indexed pgvector" },
  { label: "Active Project Tasks", value: "100% Tracked", detail: "Synchronized pipeline" },
];

export default function Home() {
  const { accentColor } = useAccent();

  return (
    <div className="flex-1 flex flex-col justify-between relative overflow-hidden">
      {/* Background radial ambient glow with accent blend */}
      <div
        className="fixed inset-0 pointer-events-none transition-colors duration-1000"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% -10%, var(--accent-subtle, rgba(99,102,241,0.15)), transparent 70%)`,
        }}
      />

      {/* Subtle modern dot matrix background texture */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-20 text-center">
        {/* Animated Focal Centerpiece: Iconic CW Cybernetic Owl Emblem with Neon Circuit Dynamics */}
        <div className="mb-8 flex flex-col items-center justify-center animate-float-gentle">
          <AnimatedLogo
            size="xl"
            variant="icon"
            animated={true}
            className="drop-shadow-[0_0_40px_rgba(6,182,212,0.45)]"
          />
          {/* Defining CW clearly under the logo */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-xs font-bold tracking-widest text-white uppercase">
              [ C W ]
            </span>
            <span className="text-zinc-500 text-xs">&bull;</span>
            <span className="font-mono text-xs text-cyan-300 font-medium tracking-wider uppercase">
              Cognitive Workspace
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[10px] tracking-[0.3em] uppercase text-zinc-400 font-medium">
            <span className="text-cyan-400">Think</span>
            <span className="mx-2 text-zinc-600">&bull;</span>
            <span className="text-purple-400">Plan</span>
            <span className="mx-2 text-zinc-600">&bull;</span>
            <span className="text-pink-400">Create</span>
          </p>
        </div>

        {/* Live Status Pill Badge */}
        <div
          className="mb-6 inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-xs font-mono font-medium backdrop-blur-md transition-all duration-300"
          style={{
            borderColor: "var(--accent-border)",
            backgroundColor: "var(--accent-subtle)",
            color: "var(--accent-text)",
          }}
        >
          <span
            className="h-2 w-2 rounded-full animate-ping"
            style={{ backgroundColor: "var(--accent-color)" }}
          />
          <span>AI-Powered Cognitive Architecture & Live Orchestration</span>
        </div>

        {/* Hero Title with Generous Typography */}
        <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl text-white">
          Smarter Context. <br />
          <span
            className="bg-clip-text text-transparent transition-all duration-700"
            style={{
              backgroundImage: `linear-gradient(135deg, #ffffff 0%, var(--accent-text, #a5b4fc) 45%, var(--accent-color, #6366f1) 85%, #fbbf24 100%)`,
            }}
          >
            Autonomous Workflows.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-300 font-light">
          Cognitive Workspace unites Gemini multi-agent reasoning, semantic vector retrieval,
          and a streamlined team roster with instant role assignments and synchronized task stages.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/projects"
            style={{
              backgroundColor: "var(--accent-color)",
              boxShadow: "0 6px 20px var(--accent-glow)",
            }}
            className="flex h-12 items-center justify-center rounded-xl px-7 text-sm font-semibold text-white transition hover:opacity-95 hover:scale-[1.02] active:scale-95"
          >
            <span>Manage Projects & Tasks &rarr;</span>
          </Link>

          <Link
            href="/members"
            className="flex h-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/90 px-6 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <span className="mr-2">👥</span>
            <span>Workspace Members</span>
          </Link>

          <Link
            href="/chat"
            className="flex h-12 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-6 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
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
              className="p-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/40 backdrop-blur-md hover:border-zinc-700 transition"
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{metric.label}</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-white">{metric.value}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{metric.detail}</p>
            </div>
          ))}
        </div>

        {/* Team Snapshot Preview (Linking to Refactored Master-Detail Members List) */}
        <div className="mt-8 w-full max-w-4xl rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-6 text-left shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Synchronized Talent Directory
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Refactored master-detail view with slide-out profile drawers and live role privileges
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
            {PREVIEW_MEMBERS.map((member) => (
              <Link
                key={member.name}
                href="/members"
                className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/70 bg-zinc-950/70 hover:border-zinc-700 hover:bg-zinc-900/90 transition group cursor-pointer"
              >
                <div
                  className={`h-10 w-10 shrink-0 rounded-xl bg-linear-to-tr ${member.color} flex items-center justify-center text-xs font-bold text-white shadow-xs group-hover:scale-105 transition-transform`}
                >
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-100 truncate group-hover:text-white">{member.name}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{member.role}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-zinc-700/60 bg-zinc-800/70 text-zinc-300"
                    >
                      {member.systemRole}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Feature Bento Grid */}
        <div className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((item) => (
            <div
              key={item.title}
              className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md transition-all hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] ${item.tagColor}`}>
                  {item.tag}
                </span>
                <span className="text-zinc-500 font-mono text-xs">{item.icon}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-100 group-hover:text-white transition-colors">
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
        <p>Cognitive Workspace &bull; Powered by Gemini 1.5, Next.js 16, FastAPI & LangGraph</p>
      </footer>
    </div>
  );
}