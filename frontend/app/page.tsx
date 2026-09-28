import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "../utils/supabase/server";

// Define the Todo structure
interface Todo {
  id: string | number;
  name: string;
}

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Type the queried response or cast the array
  const { data } = await supabase.from("todos").select();
  const todos = (data as Todo[] | null) ?? [];

  const features = [
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950/0 to-transparent" />

      <header className="relative z-10 border-b border-zinc-800/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-sm tracking-wider uppercase text-zinc-400">
              Cognitive Workspace
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span className="rounded-md border border-zinc-800 bg-zinc-900/70 px-2.5 py-1">
              v1.0.0
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300">
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
          to ingest documents, synthesize complex insights, and automate end-to-end task pipelines.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/chat"
            className="flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
          >
            Launch Workspace &rarr;
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 px-6 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Backend API Docs
          </a>
        </div>

        {/* Live Supabase Feed */}
        <div className="mt-12 w-full max-w-xl text-left">
          <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/80 px-4 py-3">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
                Connected Workspace Tasks
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Supabase Sync
              </span>
            </div>
            
            <ul className="divide-y divide-zinc-800/50 p-2">
              {todos.length > 0 ? (
                todos.map((todo: Todo) => (
                  <li
                    key={todo.id}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/40 rounded-lg transition"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span>{todo.name}</span>
                  </li>
                ))
              ) : (
                <li className="px-3 py-6 text-center text-xs text-zinc-500">
                  No active tasks found in the database.
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {features.map((item) => (
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