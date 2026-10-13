"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Status = "checking" | "online" | "offline";

export default function BackendStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setStatus(res.ok && data?.status === "ok" ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    };

    check();
    const timer = setInterval(check, 15000); // re-check every 15 seconds
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const dot =
    status === "online" ? "bg-emerald-500" : status === "offline" ? "bg-rose-500" : "bg-amber-500";
  const label =
    status === "online" ? "Backend online" : status === "offline" ? "Backend offline" : "Checking backend...";

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-zinc-400" title={`${API_URL}/health`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </div>
  );
}