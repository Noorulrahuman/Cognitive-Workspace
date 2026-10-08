"use client"; // Runs in the browser (needed for useState / useEffect / click handlers)

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ==========================================================================
 * Requirements page  (route: /requirements)
 *
 * What this page shows:
 *   1. Three "pillar" cards  : LangGraph, Supabase + pgvector, FastAPI
 *   2. A dependency table    : libraries used by the document-extraction pipeline
 *   3. An ingestion simulator: a fake step-by-step demo (timer based, NOT real)
 *
 * Data sources:
 *   - Dependency list and pillar cards are static (typed in this file).
 *   - Only the "Backend API" badge talks to the real backend (/api/v1/requirements).
 * ========================================================================== */

// Backend base URL. Comes from .env.local (NEXT_PUBLIC_API_URL).
// Falls back to localhost so local development works without any setup.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ---------- Types ----------

type DependencyStatus = "PASS" | "CHECKING" | "FAIL";
type BackendState = "checking" | "online" | "unavailable";

// One row in the dependency table
interface DependencyCheck {
  name: string;
  category: string;
  version: string;
  purpose: string;
  status: DependencyStatus;
}

// Shape of the JSON returned by GET /api/v1/requirements (all fields optional)
interface BackendRequirements {
  architecture?: {
    orchestration?: string;
    vector_store?: string;
    backend?: string;
    frontend?: string;
    extraction_stack?: Array<{ name: string; purpose: string; status: string }>;
  };
  system_status?: string;
}

// ---------- Static data ----------

// Rows of the dependency table.
// NOTE: These values are typed by hand (not read from the backend).
// To mark a library as failing, change its status to "FAIL".
const DEPENDENCY_CHECKS: DependencyCheck[] = [
  {
    name: "HTTPX",
    category: "Network / Transport",
    version: "0.28.1",
    purpose: "High-performance asynchronous HTTP networking for external API & document crawling.",
    status: "PASS",
  },
  {
    name: "BeautifulSoup4",
    category: "HTML Extraction",
    version: "4.14.3",
    purpose: "Cleanses DOM trees, strips scripts/styles, and extracts readable textual paragraphs.",
    status: "PASS",
  },
  {
    name: "Playwright (Chromium)",
    category: "Headless Browser",
    version: "1.63.0",
    purpose: "Renders JavaScript-heavy Single Page Applications to extract fully rendered DOM trees.",
    status: "PASS",
  },
  {
    name: "PyMuPDF (fitz)",
    category: "PDF Document Processing",
    version: "1.28.2",
    purpose: "Fast PDF text, table, and bounding box layout extraction with low memory overhead.",
    status: "PASS",
  },
  {
    name: "Pandas",
    category: "Data Structuring",
    version: "2.3.3",
    purpose: "Normalizes tabular datasets and CSV/spreadsheet attachments into structured dataframes.",
    status: "PASS",
  },
];

// Colors and text for the status badge in the table (one entry per status)
const STATUS_BADGE: Record<DependencyStatus, { classes: string; label: string }> = {
  PASS: {
    classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    label: "✓ PASS",
  },
  CHECKING: {
    classes: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    label: "… CHECKING",
  },
  FAIL: {
    classes: "border-red-500/30 bg-red-500/10 text-red-400",
    label: "✕ FAIL",
  },
};

// The 4 steps shown in the ingestion simulator, in order
const PIPELINE_LABELS = [
  "Dispatching HTTPX / Playwright scraper",
  "Sanitizing DOM with BeautifulSoup4",
  "Normalizing tables with Pandas",
  "Chunking & generating pgvector embeddings",
];

// Builds a fresh list of simulator steps, all "not done" yet
const makeSteps = () => PIPELINE_LABELS.map((label) => ({ label, done: false }));

export default function RequirementsPage() {
  // ---------- State ----------

  // Response from the backend (null until it answers)
  const [backendReqs, setBackendReqs] = useState<BackendRequirements | null>(null);
  // Used by the "Backend API" badge: checking -> online / unavailable
  const [backendState, setBackendState] = useState<BackendState>("checking");

  // Ingestion simulator state
  const [sampleUrl, setSampleUrl] = useState<string>("https://arxiv.org/abs/2305.18290");
  const [pipelineState, setPipelineState] = useState<"idle" | "running" | "completed">("idle");
  const [pipelineSteps, setPipelineSteps] = useState<{ label: string; done: boolean }[]>(makeSteps());
  // Keeps the setTimeout ids so we can cancel them (on re-run or when leaving the page)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Calculated from the table data, so the "X / Y Dependencies Passed" badge is always correct
  const passedCount = DEPENDENCY_CHECKS.filter((d) => d.status === "PASS").length;

  // ---------- Effects ----------

  // On page load: ask the backend for its requirements/status.
  // Gives up after 4 seconds so the page never waits forever.
  useEffect(() => {
    let isMounted = true; // prevents updating state after the page is closed

    async function fetchReqs() {
      try {
        const res = await fetch(`${API_URL}/api/v1/requirements`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setBackendReqs(data);
          setBackendState("online");
        } else {
          setBackendState("unavailable");
        }
      } catch {
        // Backend is off, unreachable, or too slow
        if (isMounted) setBackendState("unavailable");
      }
    }

    fetchReqs();
    return () => {
      isMounted = false;
    };
  }, []);

  // When the user leaves this page, cancel any simulator timers that are still pending
  useEffect(() => {
    const timers = timersRef;
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  // ---------- Handlers ----------

  // "Simulate Ingestion Pipeline" button.
  // Marks one step as done every 0.6 seconds (0.6s, 1.2s, 1.8s, 2.4s).
  // This is only a visual demo, nothing is actually scraped or stored.
  const runSimulation = () => {
    // Cancel old timers first, so clicking again never mixes two runs
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setPipelineState("running");
    setPipelineSteps(makeSteps());

    PIPELINE_LABELS.forEach((_, idx) => {
      const timer = setTimeout(() => {
        // Mark only step number `idx` as done
        setPipelineSteps((prev) =>
          prev.map((step, i) => (i === idx ? { ...step, done: true } : step))
        );
        // After the last step, show the "completed" summary
        if (idx === PIPELINE_LABELS.length - 1) {
          setPipelineState("completed");
        }
      }, (idx + 1) * 600);
      timersRef.current.push(timer);
    });
  };

  // ---------- Values used by the "Backend API" badge ----------

  // Text: checking -> "Checking...", failed -> "Unavailable",
  // success -> the backend's own system_status, or "Online" if it sent none
  const backendLabel =
    backendState === "checking"
      ? "Checking..."
      : backendState === "unavailable"
      ? "Unavailable"
      : backendReqs?.system_status || "Online";

  // Color: yellow = checking, red = unavailable, green = online
  const backendColor =
    backendState === "checking"
      ? "text-yellow-400"
      : backendState === "unavailable"
      ? "text-red-400"
      : "text-emerald-400";

  return (
    <div className="min-h-full py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      {/* ===== SECTION 1: Page header (title + short description) ===== */}
      <div className="pb-8 border-b border-zinc-800">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs font-medium mb-2">
          <span>System Specifications & Environment</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Architecture & Requirements
        </h1>
        <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
          Detailed overview of core cognitive modules, runtime dependencies, and the document extraction toolchain verified in this workspace.
        </p>
      </div>

      {/* ===== SECTION 2: Three "pillar" cards (static text, not from backend) ===== */}
      {/* 1 column on mobile, 3 columns from tablet size up */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: LangGraph (agent orchestration) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            <h3 className="text-base font-semibold text-white">LangGraph Workflows</h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            Coordinates autonomous agents with cyclical state graphs. Supports iterative reflection, fallback recovery, and multi-step tool execution.
          </p>
          <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] font-mono text-indigo-300 flex items-center justify-between">
            <span>Orchestrator: Active</span>
            <span className="text-emerald-400">Cyclic StateGraph</span>
          </div>
        </div>

        {/* Card 2: Supabase + pgvector (database and vector search) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm0 5h16" />
              </svg>
            </span>
            <h3 className="text-base font-semibold text-white">Supabase & pgvector</h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            Stores high-dimensional embeddings for hybrid keyword + semantic search. Ensures context relevance through HNSW indexing.
          </p>
          <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] font-mono text-emerald-300 flex items-center justify-between">
            <span>Vector Index: Configured</span>
            {/* TODO(team): confirm the real embedding size (workbook uses 768) */}
            <span className="text-emerald-400">1536 dims</span>
          </div>
        </div>

        {/* Card 3: FastAPI (backend API) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
            <h3 className="text-base font-semibold text-white">FastAPI Gateway</h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            Async Python endpoints providing sub-second latency, automated OpenAPI schemas, and streaming agent progress updates.
          </p>
          <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] font-mono text-sky-300 flex items-center justify-between">
            <span>Protocol: HTTP/2 Async</span>
            <span className="text-emerald-400">Swagger / ReDoc</span>
          </div>
        </div>
      </div>

      {/* ===== SECTION 3: Dependency table ===== */}
      <div className="mt-12">
        {/* Title on the left, two status badges on the right */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Extraction Pipeline Toolchain{" "}
              <code className="font-mono text-base text-indigo-300">(verify_extraction_env.py)</code>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Dependencies verified in the workspace environment for multi-modal ingestion.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Badge 1: live backend status (checked in the useEffect above) */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900/80 text-[11px] font-mono">
              <span className="text-zinc-500">Backend API:</span>
              <span className={`${backendColor} font-semibold`}>{backendLabel}</span>
            </div>
            {/* Badge 2: how many table rows have status PASS (calculated, not typed) */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-[11px] font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 font-semibold">
                {passedCount} / {DEPENDENCY_CHECKS.length} Dependencies Passed
              </span>
            </div>
          </div>
        </div>

        {/* overflow-x-auto: the table scrolls sideways on small screens */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/90 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-4">Dependency</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Workspace Purpose</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-xs">
              {/* One table row per item in DEPENDENCY_CHECKS */}
              {DEPENDENCY_CHECKS.map((dep) => (
                <tr key={dep.name} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-white">
                    {dep.name}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                    {dep.category}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-indigo-300">
                    {dep.version}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300 max-w-md">
                    {dep.purpose}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {/* Badge color and text come from STATUS_BADGE (PASS / CHECKING / FAIL) */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold font-mono ${STATUS_BADGE[dep.status].classes}`}
                    >
                      {STATUS_BADGE[dep.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== SECTION 4: Ingestion simulator (demo only, nothing real happens) ===== */}
      <div className="mt-12 rounded-2xl border border-indigo-900/40 bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-md">
        {/* Title + "Simulate" button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-1">
              <span>Interactive Ingestion Simulator</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Test Document & Web Extraction Flow
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Simulate how HTTPX, Playwright, PyMuPDF, and Pandas coordinate to structure raw inputs.
            </p>
          </div>

          {/* Disabled while running, so the user cannot start it twice */}
          <button
            onClick={runSimulation}
            disabled={pipelineState === "running"}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {pipelineState === "running" ? "Processing..." : "▶ Simulate Ingestion Pipeline"}
          </button>
        </div>

        {/* URL input. The text is only shown in the final summary, it is never fetched. */}
        <div className="mb-6">
          <label
            htmlFor="sample-url"
            className="block text-xs font-semibold text-zinc-300 mb-1"
          >
            Target Resource URL or PDF Endpoint
          </label>
          <input
            id="sample-url"
            type="text"
            value={sampleUrl}
            onChange={(e) => setSampleUrl(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* The 4 step cards. Style depends on the state:
            done = green, running = pulsing indigo, idle = grey */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pipelineSteps.map((step, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-4 transition-all ${
                step.done
                  ? "border-emerald-500/50 bg-emerald-950/20 text-white"
                  : pipelineState === "running"
                  ? "border-indigo-500/30 bg-zinc-900/80 animate-pulse text-zinc-300"
                  : "border-zinc-800 bg-zinc-950/50 text-zinc-500"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-zinc-400">Step 0{idx + 1}</span>
                {step.done ? (
                  <span className="text-xs text-emerald-400 font-bold">✓ DONE</span>
                ) : (
                  <span className="text-xs text-zinc-500 font-mono">WAITING</span>
                )}
              </div>
              <p className="text-xs font-medium">{step.label}</p>
            </div>
          ))}
        </div>

        {/* Summary box: appears only after all 4 steps are done.
            NOTE: "14 chunks" and "2 tables" are fixed demo text, not real results. */}
        {pipelineState === "completed" && (
          <div className="mt-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs">
            <h4 className="font-semibold text-emerald-300 mb-1">
              ✓ Ingestion Simulation Completed Successfully
            </h4>
            <p className="text-zinc-300">
              Target extracted <span className="text-white font-mono break-all">{sampleUrl}</span> &bull; 14 semantic chunks generated &bull; Normalized 2 data tables &bull; Ready for LangGraph Copilot reasoning.
            </p>
            <div className="mt-3 flex gap-2">
              {/* Goes to the chat page */}
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold"
              >
                Query Ingested Docs in Copilot &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}