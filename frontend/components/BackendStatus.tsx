"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { safeFetch, safeJson, API_URL } from "@/utils/apiClient";

type Status = "checking" | "online" | "offline";

export default function BackendStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastCheckRef = useRef<number>(0);

  const check = useCallback(async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      return;
    }

    setIsRefreshing(true);
    try {
      // First try standard /api/v1/health, fall back to /health
      let res = await safeFetch(`${API_URL}/api/v1/health`, { cache: "no-store" }, 1000);
      if (!res || !res.ok) {
        res = await safeFetch(`${API_URL}/health`, { cache: "no-store" }, 800);
      }
      const data = await safeJson(res);
      const isOk = Boolean(res && res.ok && (data?.status === "ok" || res.status === 200));
      setStatus(isOk ? "online" : "offline");
    } catch {
      setStatus("offline");
    } finally {
      setIsRefreshing(false);
      lastCheckRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    // Initial check on mount
    check();

    // Calm adaptive polling: check every 60s when online, 30s when offline.
    // Never poll if the browser tab/window is in the background (hidden).
    const intervalMs = status === "offline" ? 30000 : 60000;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return; // Don't spam backend while user is not looking at the app
      }
      check();
    }, intervalMs);

    // Event-driven online/offline handlers
    const handleOnline = () => check();
    const handleOffline = () => setStatus("offline");
    const handleVisibility = () => {
      // If user comes back after more than 60s, recheck once
      if (document.visibilityState === "visible" && Date.now() - lastCheckRef.current > 60000) {
        check();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [check, status]);

  const dot =
    status === "online"
      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
      : status === "offline"
      ? "bg-rose-400/80"
      : "bg-amber-400 animate-ping";

  const label =
    isRefreshing
      ? "Checking backend..."
      : status === "online"
      ? "Backend Connected"
      : status === "offline"
      ? "Local Offline Cache"
      : "Checking backend...";

  const badgeClass =
    status === "online"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
      : status === "offline"
      ? "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800"
      : "border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20";

  return (
    <button
      type="button"
      onClick={() => check()}
      disabled={isRefreshing}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-mono font-medium backdrop-blur-md transition-all cursor-pointer ${badgeClass}`}
      title={
        status === "online"
          ? "FastAPI Backend is online. Click to recheck."
          : "Operating in local offline cache mode. Click to recheck."
      }
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${isRefreshing ? "animate-spin" : ""}`} />
      <span>{label}</span>
      <svg
        className={`w-3 h-3 text-zinc-400 ml-1 transition-transform ${isRefreshing ? "animate-spin" : "opacity-60"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
}