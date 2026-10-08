import Link from "next/link";

export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const HEALTHY_STATES = ["ok", "healthy"];

const FEATURES = [
  {
    title: "Agentic Workflows",
    tag: "LangGraph",
    desc: "Multi-agent cognitive loops coordinating retrieval, reasoning, and automated decision making.",
  },
  {
    title: "Semantic Vector Search",
    tag: "pgvector & Supabase",
    desc: "Fast, dense retrieval over contextual embeddings ensuring relevant document grounding.",
  },
  {
    title: "High-Performance API",
    tag: "FastAPI",
    desc: "Asynchronous backend endpoints delivering sub-second response times and streaming completions.",
  },
];

async function getHealthStatus(): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return "offline";
    const data = await response.json();
    return data.status ?? "ok";
  } catch {
    return "offline";
  }
}

export default async function Home() {
  const healthStatus = await getHealthStatus();
  const isHealthy = HEALTHY_STATES.includes(healthStatus);

  return (
    <div className="flex-1 flex flex-col justify-between relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950/0 to-transparent" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:py-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
          <span>AI-Powered Research & Contextual Copilot</span>
        </div>

        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
          Smarter Context. <br />
          <span className="bg-linear-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
            Autonomous Workflows.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-400">
          Cognitive Workspace unites agent orchestration and semantic retrieval
          to ingest documents, synthesize complex insights, and automate
          end-to-end task pipelines.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/projects"
            className="flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 active:scale-95"
          >
            Manage Projects &rarr;
          </Link>
          <Link
            href="/chat"
            className="flex h-11 items-center justify-center rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-6 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-900/50 hover:text-white"
          >
            Launch Gemini
          </Link>
          <Link
            href="/requirements"
            className="flex h-11 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 px-6 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Requirements & Specs
          </Link>
          {process.env.NODE_ENV === "development" && (
            <a
              href={`${API_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 px-5 text-sm font-semibold text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
            >
              API Docs
            </a>
          )}
        </div>

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-sm text-zinc-400">Backend Status</p>
          <p
            className={`mt-2 text-lg font-semibold ${
              isHealthy ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {healthStatus}
          </p>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((item) => (
            <div
              key={item.title}
              className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <span className="inline-block rounded border border-zinc-700/60 bg-zinc-800/50 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
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

      <footer className="relative z-10 border-t border-zinc-900 px-6 py-6 text-center text-xs text-zinc-400">
        <p>Cognitive Workspace &bull; Built with Next.js, FastAPI, & LangGraph</p>
      </footer>
    </div>
  );
}