import Link from "next/link";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Gemini Agentic Workflows",
    tag: "LangGraph & Gemini",
    desc: "Autonomous cognitive loops coordinating dense multi-document retrieval, reasoning, and automated task execution.",
    accent: "from-indigo-500/20 to-sky-500/10",
  },
  {
    title: "Semantic Vector Grounding",
    tag: "pgvector & Supabase",
    desc: "High-density vector search ensuring evidence citations and zero-hallucination document synthesis.",
    accent: "from-emerald-500/20 to-teal-500/10",
  },
  {
    title: "Dynamic Team & Task Board",
    tag: "Managers & Developers",
    desc: "Unified task stage tracking, priority escalation, and member assignment across enterprise projects.",
    accent: "from-amber-500/20 to-orange-500/10",
  },
];

const PREVIEW_MEMBERS = [
  { name: "Dr. Sarah Chen", role: "Head of Cognitive Architecture", type: "Manager", color: "from-amber-500 to-rose-600" },
  { name: "Marcus Vance", role: "Product & Delivery Lead", type: "Manager", color: "from-indigo-600 to-purple-600" },
  { name: "Alex Rivera", role: "Senior LangGraph Engineer", type: "Developer", color: "from-blue-600 to-cyan-500" },
  { name: "Priya Sharma", role: "Fullstack Next.js Engineer", type: "Developer", color: "from-emerald-500 to-teal-600" },
];

export default function Home() {
  return (
    <div className="flex-1 flex flex-col justify-between relative overflow-hidden">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950/0 to-transparent" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:py-20">
        {/* Gemini Pill Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 backdrop-blur-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
          <span>AI-Powered Research & Gemini Orchestration</span>
        </div>

        {/* Hero Title */}
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
          Smarter Context. <br />
          <span className="bg-linear-to-r from-indigo-400 via-sky-300 to-amber-300 bg-clip-text text-transparent">
            Autonomous Workflows.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-400">
          Cognitive Workspace unites Gemini multi-agent reasoning, semantic retrieval,
          and unified team collaboration across managers and developers to automate
          end-to-end task pipelines.
        </p>

        {/* Primary Action Buttons (Requirements removed; Members & Tasks included; Copilot renamed to Gemini) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/projects"
            className="flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 active:scale-95"
          >
            Manage Projects & Tasks &rarr;
          </Link>
          <Link
            href="/members"
            className="flex h-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/90 px-6 text-sm font-semibold text-emerald-300 transition hover:bg-zinc-800 hover:text-emerald-200"
          >
            Workspace Members
          </Link>
          <Link
            href="/chat"
            className="flex h-11 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-950/40 px-6 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-900/50 hover:text-white"
          >
            Launch Gemini
          </Link>
        </div>

        {/* Team Snapshot Preview (Separating Managers and Developers) */}
        <div className="mt-12 w-full max-w-4xl rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-6 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/60">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Workspace Team Roster
              </h2>
              <p className="text-xs text-zinc-400">
                Coordinated workflow between leadership managers and engineering developers
              </p>
            </div>
            <Link
              href="/members"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
            >
              <span>View All Members</span>
              <span>&rarr;</span>
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PREVIEW_MEMBERS.map((member) => (
              <div
                key={member.name}
                className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/60 bg-zinc-950/60 hover:border-zinc-700 transition"
              >
                <div
                  className={`h-9 w-9 shrink-0 rounded-full bg-linear-to-tr ${member.color} flex items-center justify-center text-xs font-bold text-white shadow-xs`}
                >
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-100 truncate">{member.name}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{member.role}</p>
                  <span
                    className={`inline-block mt-1 text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                      member.type === "Manager"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        : "border-sky-500/30 bg-sky-500/10 text-sky-300"
                    }`}
                  >
                    {member.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((item) => (
            <div
              key={item.title}
              className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <span className="inline-block rounded-md border border-zinc-700/60 bg-zinc-800/50 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                {item.tag}
              </span>
              <h3 className="mt-3 text-base font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors">
                {item.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 px-6 py-6 text-center text-xs text-zinc-500">
        <p>Cognitive Workspace &bull; Powered by Gemini 1.5, Next.js, FastAPI & LangGraph</p>
      </footer>
    </div>
  );
}