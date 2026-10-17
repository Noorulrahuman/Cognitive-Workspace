"use client";

import { useEffect, useState } from "react";
import MyTasks from "./MyTasks";

type InboxKind = "notification" | "message";

type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  body: string;
  from: string;
  createdAt: string;
  read: boolean;
};

type Tab = "all" | InboxKind | "tasks";

const STORAGE_KEY = "cognitive_inbox";

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

function seedItems(): InboxItem[] {
  return [
    {
      id: makeId(),
      kind: "notification",
      title: "Welcome to your Inbox",
      body: "Task updates and project activity will show up here.",
      from: "Cognitive Workspace",
      createdAt: minutesAgo(5),
      read: false,
    },
    {
      id: makeId(),
      kind: "notification",
      title: "New task assigned to you",
      body: "You were assigned a task in Financial Document Intelligence.",
      from: "System",
      createdAt: minutesAgo(90),
      read: false,
    },
    {
      id: makeId(),
      kind: "message",
      title: "Review the project plan",
      body: "Can you review the plan before tomorrow's meeting?",
      from: "Hemavarthini",
      createdAt: minutesAgo(240),
      read: true,
    },
  ];
}

function timeAgo(iso: string) {
  const diff = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff} min ago`;
  const hours = Math.round(diff / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day ago`;
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [tab, setTab] = useState<Tab>("all");
  const [composeOpen, setComposeOpen] = useState<boolean>(false);
  const [to, setTo] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Load saved inbox (or create sample items the first time)
  useEffect(() => {
    let initial: InboxItem[] | null = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) initial = parsed as InboxItem[];
      }
    } catch {
      // ignore broken storage
    }
    if (!initial) {
      initial = seedItems();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      } catch {
        // ignore
      }
    }
    setItems(initial);
    setLoaded(true);
    window.dispatchEvent(new Event("cognitive-inbox-change"));
  }, []);

  const save = (next: InboxItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event("cognitive-inbox-change"));
  };
  const markRead = (id: string) => {
    save(items.map((i) => (i.id === id ? { ...i, read: true } : i)));
  };

  const markAllRead = () => {
    save(items.map((i) => ({ ...i, read: true })));
  };

  const remove = (id: string) => {
    save(items.filter((i) => i.id !== id));
  };

  const sendMessage = () => {
    const recipient = to.trim();
    const body = text.trim();
    if (!recipient) {
      setError("Please enter who the message is for.");
      return;
    }
    if (!body) {
      setError("Please write a message.");
      return;
    }
    if (body.length > 500) {
      setError("Message must be 500 characters or fewer.");
      return;
    }
    const item: InboxItem = {
      id: makeId(),
      kind: "message",
      title: `Message to ${recipient}`,
      body,
      from: "You",
      createdAt: new Date().toISOString(),
      read: true,
    };
    save([item, ...items]);
    setTo("");
    setText("");
    setError("");
    setComposeOpen(false);
    setTab("message");
  };

  const unreadCount = items.filter((i) => !i.read).length;
  const visible = items
    .filter((i) => tab === "all" || i.kind === tab)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "notification", label: "Notifications" },
    { id: "message", label: "Messages" },
    { id: "tasks", label: "My Tasks" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Inbox</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-sky-500/20 border border-sky-400/40 px-2.5 py-0.5 text-xs font-semibold text-sky-300">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Mark all read
          </button>
          <button
            onClick={() => setComposeOpen(!composeOpen)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
          >
            + New message
          </button>
        </div>
      </div>

      {/* Compose */}
      {composeOpen && (
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To (member name)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your message..."
            rows={3}
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
          {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setComposeOpen(false);
                setError("");
              }}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={sendMessage}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              tab === t.id
                ? "border-indigo-500/50 bg-indigo-500/15 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-4">
        {tab === "tasks" ? (
          <MyTasks />
        ) : !loaded ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <div className="h-7 w-7 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <p className="mt-3 text-xs font-mono">Loading your inbox...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
            <p className="text-sm font-semibold text-zinc-300">You are all caught up</p>
            <p className="mt-1 text-xs text-zinc-500">
              New notifications and messages will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((item) => (
              <li
                key={item.id}
                onClick={() => markRead(item.id)}
                className={`group flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                  item.read
                    ? "border-zinc-800 bg-zinc-900/40"
                    : "border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10"
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    item.read ? "bg-zinc-700" : "bg-sky-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-sm truncate ${
                        item.read ? "text-zinc-300" : "font-semibold text-white"
                      }`}
                    >
                      {item.title}
                    </p>
                    <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-mono uppercase text-zinc-400">
                      {item.kind === "message" ? "Message" : "Notification"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{item.body}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {item.from} · {timeAgo(item.createdAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(item.id);
                  }}
                  aria-label="Delete"
                  className="text-xs text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}