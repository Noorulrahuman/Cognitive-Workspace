"use client"; // Runs in the browser (needed for useState / useEffect / click handlers)

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/* ==========================================================================
 * Copilot page  (route: /chat)
 *
 * What this page shows:
 *   1. A header with the project picker and a "New chat" button
 *   2. A friendly welcome screen with 3 starter cards (before the first message)
 *   3. The chat messages (you on the right, Copilot on the left)
 *   4. The message box at the bottom
 *
 * IMPORTANT: right now the Copilot replies are SAMPLE answers (demo mode).
 *   - Nothing is sent to the backend or to Gemini.
 *   - A timer waits ~1.2 seconds and then shows one of 3 fixed answers.
 *   When the real chat API is ready, replace the setTimeout block inside
 *   handleSendMessage with a real fetch call, then set IS_DEMO_MODE = false.
 *
 * Opened from the Projects page via /chat?project=<project name>
 * ========================================================================== */

// true  = replies are samples, a "Demo" badge is shown
// false = replies come from the real backend, the badge shows "Live"
const IS_DEMO_MODE = true;

// Name that is always available in the project dropdown
const GENERAL_PROJECT = "General Cognitive Workspace";

// ---------- Types ----------

interface Message {
  id: string;
  sender: "user" | "copilot";
  content: string;
  timestamp: string;
  steps?: string[]; // "How I got this answer" (only for Copilot messages)
}

// Only the field we need from a project saved in localStorage
interface StoredProject {
  name: string;
}

// The 3 cards on the welcome screen
const STARTERS = [
  {
    icon: "📊",
    title: "Extract key numbers",
    text: "Extract the key numbers and tables from my documents",
  },
  {
    icon: "🔎",
    title: "Search my documents",
    text: "Search my documents for the most relevant information",
  },
  {
    icon: "💡",
    title: "Summarize this project",
    text: "Give me a short summary of this project",
  },
];

// ---------- Small helper functions ----------

// Creates a unique id for each message: "user-2", "copilot-3", ...
let messageSequence = 1;
function getNextMessageId(prefix: string): string {
  messageSequence += 1;
  return `${prefix}-${messageSequence}`;
}

// Current time as "HH:MM", shown under each message
function getFormattedTime(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// Shows **text** as bold (the sample answers use it)
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
  // ---------- Which project is selected ----------

  // Read ?project=... from the URL (set by the "Copilot" button on the Projects page)
  const searchParams = useSearchParams();
  const initialProject = searchParams.get("project") || "Financial Document Intelligence";
  const [selectedProject, setSelectedProject] = useState<string>(initialProject);

  // ---------- Chat state ----------

  // Starts empty: the welcome screen is shown until the first message
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // true while Copilot is "thinking"
  const [copiedId, setCopiedId] = useState<string | null>(null); // which message was just copied

  // Invisible element at the bottom of the chat, used for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Stores the sample-reply timer so we can cancel it if the user leaves the page
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll whenever a message is added or the "thinking" state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // When the user leaves this page, cancel the pending sample reply
  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  // ---------- Project dropdown list ----------

  // Default list, shown until the real list loads
  const [projectsList, setProjectsList] = useState<string[]>([
    "Financial Document Intelligence",
    "Biomedical Literature Search",
    "Regulatory Web Scraper",
    GENERAL_PROJECT,
  ]);

  // Load real project names: Supabase first, localStorage as backup
  useEffect(() => {
    async function fetchProjectNames() {
      // 1. Try Supabase
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("projects").select("name").order("name");
        if (!error && data && data.length > 0) {
          const names = Array.from(new Set([...data.map((p) => p.name), GENERAL_PROJECT]));
          setProjectsList(names);
          return;
        }
      } catch {
        // Supabase unavailable: fall through to localStorage
      }

      // 2. Backup: projects saved in the browser by the Projects page
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
            // Saved data was broken: ignore it
          }
        }
      }
    }
    fetchProjectNames();
  }, []);

  // If the project from the URL is not in the list, add it at the top.
  const projectOptions = projectsList.includes(selectedProject)
    ? projectsList
    : [selectedProject, ...projectsList];

  // ---------- Actions ----------

  // Called by the Send button / Enter key (no argument)
  // and by the starter cards (with the card text)
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isProcessing) return; // ignore empty text or double-send

    // 1. Show the user's message immediately
    const userMsg: Message = {
      id: getNextMessageId("user"),
      sender: "user",
      content: text,
      timestamp: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsProcessing(true);

    // 2. DEMO ONLY: fake the Copilot's answer after 1.2 seconds.
    //    TODO(team): replace this block with the real chat API call.
    replyTimerRef.current = setTimeout(() => {
      const lower = text.toLowerCase();
      let responseText = "";
      let steps: string[] = [];

      if (lower.includes("extract") || lower.includes("table") || lower.includes("number")) {
        // Sample answer 1. The numbers are made-up sample data.
        steps = ["Read your documents", "Found the tables and key numbers", "Organized them for you"];
        responseText = `I found 3 key sections in "${selectedProject}":\n\n1. **Revenue growth**: +14.2% compared to last year\n2. **Operating margin**: 28.5%\n3. **Free cash flow**: $4.1B\n\n(Sample numbers for the demo.)`;
      } else if (lower.includes("search") || lower.includes("find") || lower.includes("relevant")) {
        // Sample answer 2
        steps = ["Understood your question", "Searched your documents", "Picked the 5 best matches"];
        responseText = `I found 5 passages in "${selectedProject}" that match your question closely. They agree with each other, and I did not find any conflicts. (Sample answer for the demo.)`;
      } else {
        // Sample answer 3: anything else
        steps = ["Understood your question", "Looked through the project documents", "Wrote a short answer"];
        responseText = `Here is a quick overview of "${selectedProject}": your documents were reviewed and nothing looks out of place. Ask me about specific numbers, topics or documents and I will dig deeper. (Sample answer for the demo.)`;
      }

      // 3. Show Copilot's message and stop the "thinking" indicator
      const copilotMsg: Message = {
        id: getNextMessageId("copilot"),
        sender: "copilot",
        content: responseText,
        timestamp: getFormattedTime(),
        steps,
      };

      setMessages((prev) => [...prev, copilotMsg]);
      setIsProcessing(false);
    }, 1200);
  };

  // Clears the chat and goes back to the welcome screen
  const handleNewChat = () => {
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    setMessages([]);
    setInputPrompt("");
    setIsProcessing(false);
  };

  // Copies one Copilot message to the clipboard
  const handleCopy = (m: Message) => {
    navigator.clipboard.writeText(m.content);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const hasMessages = messages.length > 0;

  return (
    // 100dvh = full visible screen height; 65px = approx. navbar height
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 pt-4 pb-3 h-[calc(100dvh-65px)]">
      {/* ===== SECTION 1: Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-base font-bold text-white">
              Copilot
              {/* Badge: "Demo" while answers are samples, "Live" when real */}
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  IS_DEMO_MODE
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                {IS_DEMO_MODE ? "Demo" : "Live"}
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Ask questions about your project documents</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Project picker */}
          <div className="flex items-center gap-2">
            <label htmlFor="project-select" className="text-xs text-zinc-500">
              Project
            </label>
            <select
              id="project-select"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="max-w-52 truncate rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              {projectOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* New chat: only shown when there is something to clear */}
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
          // ----- Welcome screen (before the first message) -----
          <div className="h-full flex flex-col items-center justify-center text-center px-2">
            <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              How can I help you today?
            </h2>
            <p className="mt-2 text-sm text-zinc-400 max-w-md">
              I am ready to answer questions about{" "}
              <span className="font-semibold text-indigo-300">{selectedProject}</span>. Pick an idea
              below or type your own question.
            </p>

            {/* 3 starter cards */}
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
          // ----- Messages -----
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
                        : "bg-linear-to-br from-indigo-500 to-violet-500 text-white"
                    }`}
                  >
                    {isUser ? "You" : "AI"}
                  </div>

                  <div className={`flex min-w-0 max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <span className="mb-1 text-[11px] text-zinc-500">
                      {isUser ? "You" : "Copilot"} &bull; {m.timestamp}
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

                    {/* Copilot extras: copy button + "how I got this answer" */}
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
                              How I got this answer
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

            {/* "Thinking" bubble with 3 bouncing dots */}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-[11px] font-bold text-white">
                  AI
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" />
                </div>
              </div>
            )}
          </div>
        )}
        {/* Auto-scroll target (always the last element) */}
        <div ref={messagesEndRef} />
      </div>

      {/* ===== SECTION 3: Message box (Enter also sends, because it is a <form>) ===== */}
      <div className="pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault(); // stop the page from reloading
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            aria-label="Message to Copilot"
            placeholder={`Ask something about ${selectedProject}...`}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isProcessing}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 pr-28 text-sm text-white placeholder-zinc-500 shadow-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          {/* Send button: disabled while thinking or when the box is empty */}
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
          {IS_DEMO_MODE
            ? "Demo mode: these are sample answers, not real results."
            : "Copilot can make mistakes. Please double-check important information."}
        </p>
      </div>
    </div>
  );
}

// The page itself. useSearchParams() needs <Suspense> in Next.js,
// so ChatContent is wrapped here and a small loading text shows meanwhile.
export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            Loading Copilot...
          </div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
