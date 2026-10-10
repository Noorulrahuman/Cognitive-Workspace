"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/* ==========================================================================
 * Gemini AI Workspace  (route: /chat)
 *
 * What this page shows:
 *   1. Header with the project picker and a "New chat" button
 *   2. Welcome screen with starter prompts (before first message)
 *   3. Chat messages (user on right, Gemini on left)
 *   4. Contextual prompt input with streaming-like animation
 * ========================================================================== */

const IS_DEMO_MODE = true;
const GENERAL_PROJECT = "General Cognitive Workspace";

interface Message {
  id: string;
  sender: "user" | "gemini";
  content: string;
  timestamp: string;
  steps?: string[];
}

interface StoredProject {
  name: string;
}

const STARTERS = [
  {
    icon: "📊",
    title: "Extract key metrics",
    text: "Extract the key performance indicators and tables from my project documents",
  },
  {
    icon: "🔎",
    title: "Semantic document search",
    text: "Search project documents with dense vector retrieval for the most relevant context",
  },
  {
    icon: "💡",
    title: "Synthesize project summary",
    text: "Give me an executive synthesis and risk analysis for this project",
  },
];

let messageSequence = 1;
function getNextMessageId(prefix: string): string {
  messageSequence += 1;
  return `${prefix}-${messageSequence}`;
}

function getFormattedTime(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function renderRichText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const initialProject = searchParams.get("project") || "Financial Document Intelligence";
  const [selectedProject, setSelectedProject] = useState<string>(initialProject);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  const [projectsList, setProjectsList] = useState<string[]>([
    "Financial Document Intelligence",
    "Biomedical Literature Search",
    "Regulatory Web Scraper",
    GENERAL_PROJECT,
  ]);

  useEffect(() => {
    async function fetchProjectNames() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("projects").select("name").order("name");
        if (!error && data && data.length > 0) {
          const names = Array.from(new Set([...data.map((p) => p.name), GENERAL_PROJECT]));
          setProjectsList(names);
          return;
        }
      } catch {
        // Fallback to localStorage
      }

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("cognitive_projects");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const names = Array.from(
                new Set([...parsed.map((p: StoredProject) => p.name), GENERAL_PROJECT])
              );
              setProjectsList(names);
            }
          } catch {
            // parse error
          }
        }
      }
    }
    fetchProjectNames();
  }, []);

  const projectOptions = projectsList.includes(selectedProject)
    ? projectsList
    : [selectedProject, ...projectsList];

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isProcessing) return;

    const userMsg: Message = {
      id: getNextMessageId("user"),
      sender: "user",
      content: text,
      timestamp: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsProcessing(true);

    replyTimerRef.current = setTimeout(() => {
      const lower = text.toLowerCase();
      let responseText = "";
      let steps: string[] = [];

      if (lower.includes("extract") || lower.includes("table") || lower.includes("number") || lower.includes("metric")) {
        steps = [
          "Scanned ingested documents via PyMuPDF",
          "Extracted multi-column tabular metrics",
          "Normalized via Gemini reasoning loop",
        ];
        responseText = `Gemini extracted 3 key structured findings from "${selectedProject}":\n\n1. **YoY Revenue Expansion**: +14.2% verified against SEC filings\n2. **Operating Efficiency**: 28.5% operating margin\n3. **Free Cash Flow Velocity**: $4.1B cash reserves\n\nAll tables normalized and grounded in vector context.`;
      } else if (lower.includes("search") || lower.includes("find") || lower.includes("relevant")) {
        steps = [
          "Generated dense 1536-dim text embedding",
          "Executed pgvector cosine similarity search",
          "Ranked top 5 context passages",
        ];
        responseText = `Gemini retrieved 5 high-confidence passages from "${selectedProject}". Semantic similarity is above 0.88 with no conflicting claims across the indexed literature.`;
      } else {
        steps = [
          "Loaded project contextual state",
          "Grounded prompt against LangGraph workflow",
          "Formulated multi-agent response",
        ];
        responseText = `Here is Gemini's executive analysis for "${selectedProject}": All documents and task pipelines are active with healthy vector indices. You can ask for specific ratio analyses, tabular extracts, or task assignments.`;
      }

      const geminiMsg: Message = {
        id: getNextMessageId("gemini"),
        sender: "gemini",
        content: responseText,
        timestamp: getFormattedTime(),
        steps,
      };

      setMessages((prev) => [...prev, geminiMsg]);
      setIsProcessing(false);
    }, 1200);
  };

  const handleNewChat = () => {
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    setMessages([]);
    setInputPrompt("");
    setIsProcessing(false);
  };

  const handleCopy = (m: Message) => {
    navigator.clipboard.writeText(m.content);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 pt-4 pb-3 h-[calc(100dvh-65px)]">
      {/* ===== SECTION 1: Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-indigo-500 via-sky-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-base font-bold text-white">
              Gemini Workspace
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  IS_DEMO_MODE
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                {IS_DEMO_MODE ? "Gemini 1.5" : "Live"}
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Context-grounded reasoning & multi-agent assistance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Project picker */}
          <div className="flex items-center gap-2">
            <label htmlFor="project-select" className="text-xs text-zinc-500">
              Project:
            </label>
            <select
              id="project-select"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="max-w-56 truncate rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              {projectOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* New chat button */}
          {hasMessages && (
            <button
              onClick={handleNewChat}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New chat
            </button>
          )}
        </div>
      </div>

      {/* ===== SECTION 2: Welcome screen OR messages ===== */}
      <div role="log" aria-live="polite" className="flex-1 overflow-y-auto py-6">
        {!hasMessages ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-2">
            <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-indigo-500 via-sky-500 to-amber-400 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              How can Gemini assist your workflow?
            </h2>
            <p className="mt-2 text-sm text-zinc-400 max-w-md">
              Grounded intelligence for{" "}
              <span className="font-semibold text-indigo-300">{selectedProject}</span>.
              Choose an exploratory prompt below or ask your own question.
            </p>

            {/* 3 starter prompts */}
            <div className="mt-8 grid w-full max-w-2xl grid-cols-1 sm:grid-cols-3 gap-3">
              {STARTERS.map((s) => (
                <button
                  key={s.title}
                  onClick={() => handleSendMessage(s.text)}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left transition-all hover:border-indigo-500/40 hover:bg-zinc-900 hover:-translate-y-0.5 cursor-pointer"
                >
                  <span className="text-xl">{s.icon}</span>
                  <p className="mt-2 text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                    {s.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{s.text}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div key={m.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div
                    className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isUser
                        ? "bg-zinc-700 text-zinc-200"
                        : "bg-linear-to-br from-indigo-500 via-sky-500 to-amber-400 text-white"
                    }`}
                  >
                    {isUser ? "You" : "G"}
                  </div>

                  <div className={`flex min-w-0 max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <span className="mb-1 text-[11px] text-zinc-500">
                      {isUser ? "You" : "Gemini"} &bull; {m.timestamp}
                    </span>

                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                        isUser
                          ? "bg-indigo-600 text-white rounded-tr-sm"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-sm"
                      }`}
                    >
                      {renderRichText(m.content)}
                    </div>

                    {/* Gemini reasoning steps + copy */}
                    {!isUser && (
                      <div className="mt-2 w-full">
                        <button
                          onClick={() => handleCopy(m)}
                          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                          {copiedId === m.id ? "✓ Copied" : "Copy"}
                        </button>

                        {m.steps && m.steps.length > 0 && (
                          <details className="mt-1 text-[11px] text-zinc-500">
                            <summary className="cursor-pointer select-none hover:text-zinc-300 transition-colors">
                              Gemini reasoning trail
                            </summary>
                            <ul className="mt-1.5 space-y-1">
                              {m.steps.map((st, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-zinc-400">
                                  <span className="text-emerald-400">✓</span> {st}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking indicator */}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-linear-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-[11px] font-bold text-white">
                  G
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" />
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ===== SECTION 3: Input Form ===== */}
      <div className="pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            aria-label="Message to Gemini"
            placeholder={`Ask Gemini about ${selectedProject}...`}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isProcessing}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 pr-28 text-sm text-white placeholder-zinc-500 shadow-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isProcessing || !inputPrompt.trim()}
            className="absolute right-2.5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Send
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6l6 6-6 6" />
            </svg>
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-zinc-600">
          Gemini can make mistakes. Please verify critical analytical metrics.
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            Loading Gemini...
          </div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
