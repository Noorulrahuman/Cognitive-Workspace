"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface Message {
  id: string;
  sender: "user" | "copilot";
  content: string;
  timestamp: string;
  steps?: string[];
}

let messageSequence = 1;
function getNextMessageId(prefix: string): string {
  messageSequence += 1;
  return `${prefix}-${messageSequence}`;
}

function getFormattedTime(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const initialProject = searchParams.get("project") || "Financial Document Intelligence";

  const [selectedProject, setSelectedProject] = useState<string>(initialProject);
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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const [projectsList, setProjectsList] = useState<string[]>([
    "Financial Document Intelligence",
    "Biomedical Literature Search",
    "Regulatory Web Scraper",
    "General Cognitive Workspace",
  ]);

  useEffect(() => {
    async function fetchProjectNames() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("projects").select("name").order("name");
        if (!error && data && data.length > 0) {
          const names = Array.from(new Set([...data.map((p) => p.name), "General Cognitive Workspace"]));
          setProjectsList(names);
          return;
        }
      } catch {
        // ignore
      }

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("cognitive_projects");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const names = Array.from(new Set([...parsed.map((p: any) => p.name), "General Cognitive Workspace"]));
              setProjectsList(names);
            }
          } catch {
            // ignore
          }
        }
      }
    }
    fetchProjectNames();
  }, []);

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

    // Simulate Agentic Thought Process & Synthesis
    setTimeout(() => {
      let responseText = "";
      let steps: string[] = [];

      if (text.toLowerCase().includes("extract") || text.toLowerCase().includes("table")) {
        steps = [
          "Parsing layout with PyMuPDF",
          "Extracting tables with Pandas DataFrame normalizer",
          "Generated structured JSON outputs",
        ];
        responseText = `Extracted 3 tabular sections from the active project workspace:\n\n1. **Revenue Growth**: +14.2% YoY\n2. **Operating Margin**: 28.5% (adjusted for recurring R&D)\n3. **Free Cash Flow**: $4.1B\n\nAll tables have been structured and indexed into Supabase pgvector.`;
      } else if (text.toLowerCase().includes("vector") || text.toLowerCase().includes("search") || text.toLowerCase().includes("rag")) {
        steps = [
          "Computing 1536-dim OpenAI embedding",
          "Executing HNSW cosine similarity search on pgvector",
          "Retrieved top-k (5) grounding chunks (score > 0.88)",
        ];
        responseText = `Semantic vector retrieval found 5 highly relevant chunks with similarity scores ranging from 0.89 to 0.94. The retrieved context confirms full alignment with current workspace policies.`;
      } else {
        steps = [
          "LangGraph Router: Dispatched query to Research Specialist Agent",
          "Evaluated multi-source context",
          "Synthesizing final cognitive response",
        ];
        responseText = `Based on the latest ingestion for "${selectedProject}", the multi-agent cognitive loop evaluated your query. Automated cross-referencing completed without conflict, and all dependencies are synchronized.`;
      }

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

  const starterPrompts = [
    "Extract key metrics and tables from the 10-K report",
    "Run semantic similarity search on Supabase embeddings",
    "Analyze LangGraph multi-agent flow dependencies",
  ];

  return (
    <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 sm:p-6 h-[calc(100vh-65px)]">
      {/* Copilot Header */}
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
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Interactive multi-agent retrieval and reasoning engine
            </p>
          </div>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400 font-mono">Workspace Context:</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            {projectsList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-zinc-500">
              <span>{m.sender === "user" ? "You" : "Cognitive Copilot"}</span>
              <span>&bull;</span>
              <span>{m.timestamp}</span>
            </div>

            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap shadow-md ${
                m.sender === "user"
                  ? "bg-indigo-600 text-white rounded-br-xs"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-xs"
              }`}
            >
              {/* Agent Thinking Steps Accordion */}
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

              {m.content}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex flex-col items-start">
            <div className="max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-xs text-zinc-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Orchestrating agents and generating response...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompts */}
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

      {/* Chat Input Bar */}
      <div className="border-t border-zinc-800 pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder="Ask about workspace documents, extraction jobs, or agent workflows..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isProcessing}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 pr-24 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
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
