"use client"; // Runs in the browser (needed for useState / useEffect / click handlers)

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/* ==========================================================================
 * Chat page  (route: /chat)  ->  the "Cognitive Copilot" screen
 *
 * What this page shows:
 *   1. Header with a "Workspace Context" dropdown (which project to chat about)
 *   2. A scrolling list of chat messages (user on the right, copilot on the left)
 *   3. Starter prompt buttons + the text input bar
 *
 * IMPORTANT: right now the copilot replies are FAKE (demo mode).
 *   - Nothing is sent to the backend or to Gemini.
 *   - A timer waits ~1.2 seconds and then shows one of 3 fixed answers.
 *   When the real chat API is ready, replace the setTimeout block inside
 *   handleSendMessage with a real fetch call, then set IS_DEMO_MODE = false.
 *
 * Opened from the Projects page via /chat?project=<project name>
 * ========================================================================== */

// true  = replies are simulated, badge shows "Demo"
// false = replies come from the real backend, badge shows "Live"
const IS_DEMO_MODE = true;

// Name that is always available in the project dropdown
const GENERAL_PROJECT = "General Cognitive Workspace";

// ---------- Types ----------

// One chat message
interface Message {
  id: string;
  sender: "user" | "copilot";
  content: string;
  timestamp: string;
  steps?: string[]; // "Agent Reasoning Steps" shown above a copilot reply
}

// Only the field we need from a project saved in localStorage
interface StoredProject {
  name: string;
}

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

function ChatContent() {
  // ---------- Which project is selected ----------

  // Read ?project=... from the URL (set by the "Copilot ->" button on the Projects page)
  const searchParams = useSearchParams();
  const initialProject = searchParams.get("project") || "Financial Document Intelligence";

  const [selectedProject, setSelectedProject] = useState<string>(initialProject);

  // ---------- Chat state ----------

  // All messages. We start with one welcome message from the copilot.
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-welcome",
      sender: "copilot",
      content: `Hello! I am your Cognitive Workspace Copilot. I'm connected to the "${initialProject}" context. How can I help synthesize insights, parse documents, or run multi-agent workflows today?`,
      timestamp: "Just now",
      steps: ["Initialized LangGraph agent state", "Grounding context in pgvector knowledge base"],
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // true while "copilot is thinking"

  // Invisible element at the bottom of the chat list, used for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Stores the fake-reply timer so we can cancel it if the user leaves the page
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scrolls the chat down to the newest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll whenever a message is added or the "thinking" state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // When the user leaves this page, cancel the pending fake reply
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
          // Set removes duplicate names
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
  // Otherwise the dropdown would show a different project than the one selected.
  const projectOptions = projectsList.includes(selectedProject)
    ? projectsList
    : [selectedProject, ...projectsList];

  // ---------- Sending a message ----------

  // Called by the Send button / Enter key (no argument)
  // and by the starter prompt buttons (with the prompt text)
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

    // 2. DEMO ONLY: fake the copilot's answer after 1.2 seconds.
    //    TODO(team): replace this block with the real chat API call.
    replyTimerRef.current = setTimeout(() => {
      let responseText = "";
      let steps: string[] = [];

      if (text.toLowerCase().includes("extract") || text.toLowerCase().includes("table")) {
        // Fixed answer 1: extraction. The numbers below are made-up sample data.
        steps = [
          "Parsing layout with PyMuPDF",
          "Extracting tables with Pandas DataFrame normalizer",
          "Generated structured JSON outputs",
        ];
        responseText = `Extracted 3 tabular sections from the active project workspace:\n\n1. **Revenue Growth**: +14.2% YoY\n2. **Operating Margin**: 28.5% (adjusted for recurring R&D)\n3. **Free Cash Flow**: $4.1B\n\nAll tables have been structured and indexed into Supabase pgvector.`;
      } else if (text.toLowerCase().includes("vector") || text.toLowerCase().includes("search") || text.toLowerCase().includes("rag")) {
        // Fixed answer 2: vector search.
        // TODO(team): text says "1536-dim OpenAI embedding"; the workbook uses a 768-dim Gemini model.
        steps = [
          "Computing 1536-dim OpenAI embedding",
          "Executing HNSW cosine similarity search on pgvector",
          "Retrieved top-k (5) grounding chunks (score > 0.88)",
        ];
        responseText = `Semantic vector retrieval found 5 highly relevant chunks with similarity scores ranging from 0.89 to 0.94. The retrieved context confirms full alignment with current workspace policies.`;
      } else {
        // Fixed answer 3: anything else
        steps = [
          "LangGraph Router: Dispatched query to Research Specialist Agent",
          "Evaluated multi-source context",
          "Synthesizing final cognitive response",
        ];
        responseText = `Based on the latest ingestion for "${selectedProject}", the multi-agent cognitive loop evaluated your query. Automated cross-referencing completed without conflict, and all dependencies are synchronized.`;
      }

      // 3. Show the copilot's message and stop the "thinking" indicator
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

  // Quick-start buttons shown above the input bar
  const starterPrompts = [
    "Extract key metrics and tables from the 10-K report",
    "Run semantic similarity search on Supabase embeddings",
    "Analyze LangGraph multi-agent flow dependencies",
  ];

  return (
    // 100dvh = full visible screen height; 65px = approx. navbar height
    <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 sm:p-6 h-[calc(100dvh-65px)]">
      {/* ===== SECTION 1: Header (title + project dropdown) ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Cognitive Copilot
              {/* Badge: "Demo" (yellow) while replies are fake, "Live" (green) when real */}
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  IS_DEMO_MODE
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                {IS_DEMO_MODE ? "Demo" : "Live"}
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Interactive multi-agent retrieval and reasoning engine
            </p>
          </div>
        </div>

        {/* Project selector: chooses which project the chat is about */}
        <div className="flex items-center gap-2">
          <label htmlFor="project-select" className="text-xs text-zinc-400 font-mono">
            Workspace Context:
          </label>
          <select
            id="project-select"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            {projectOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== SECTION 2: Messages list (scrolls up/down) ===== */}
      {/* role="log" + aria-live: screen readers announce new messages */}
      <div role="log" aria-live="polite" className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
          >
            {/* Sender name + time */}
            <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-zinc-500">
              <span>{m.sender === "user" ? "You" : "Cognitive Copilot"}</span>
              <span>&bull;</span>
              <span>{m.timestamp}</span>
            </div>

            {/* Message bubble: indigo for the user, dark for the copilot */}
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap shadow-md ${
                m.sender === "user"
                  ? "bg-indigo-600 text-white rounded-br-xs"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-xs"
              }`}
            >
              {/* "Agent Reasoning Steps": only copilot messages have steps */}
              {m.steps && m.steps.length > 0 && (
                <div className="mb-3 pb-2 border-b border-zinc-800/80">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-400 font-semibold mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Agent Reasoning Steps
                  </div>
                  <ul className="space-y-1">
                    {m.steps.map((st, i) => (
                      <li key={i} className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span> {st}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* The message text itself */}
              {m.content}
            </div>
          </div>
        ))}

        {/* "Thinking..." bubble, visible only while waiting for the reply */}
        {isProcessing && (
          <div className="flex flex-col items-start">
            <div className="max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-xs text-zinc-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Orchestrating agents and generating response...</span>
            </div>
          </div>
        )}
        {/* Auto-scroll target (always the last element) */}
        <div ref={messagesEndRef} />
      </div>

      {/* ===== SECTION 3: Starter prompt buttons (click = send that text) ===== */}
      <div className="pt-2 pb-3 flex flex-wrap gap-2">
        {starterPrompts.map((sp) => (
          <button
            key={sp}
            onClick={() => handleSendMessage(sp)}
            className="text-[11px] px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-indigo-300 hover:border-indigo-500/30 transition-all cursor-pointer"
          >
            &ldquo;{sp}&rdquo;
          </button>
        ))}
      </div>

      {/* ===== SECTION 4: Input bar (Enter key also sends, because it is a <form>) ===== */}
      <div className="border-t border-zinc-800 pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault(); // stop the page from reloading
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            aria-label="Message to the copilot"
            placeholder="Ask about workspace documents, extraction jobs, or agent workflows..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isProcessing}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 pr-24 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          {/* Send button: disabled while thinking or when the input is empty */}
          <button
            type="submit"
            disabled={isProcessing || !inputPrompt.trim()}
            className="absolute right-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            Send &rarr;
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-zinc-500">
          Cognitive Workspace Copilot integrates LangGraph multi-agent loops and Supabase pgvector retrieval.
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
            Loading Cognitive Copilot...
          </div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}