"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [backendStatus, setBackendStatus] = useState<"online" | "offline" | "checking">("checking");

  useEffect(() => {
    let isMounted = true;
    async function checkHealth() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/health", {
          cache: "no-store",
        });
        if (isMounted) {
          if (res.ok) {
            setBackendStatus("online");
          } else {
            setBackendStatus("offline");
          }
        }
      } catch {
        if (isMounted) {
          setBackendStatus("offline");
        }
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: "Overview", href: "/" },
    { name: "Projects", href: "/projects" },
    { name: "Requirements", href: "/requirements" },
    { name: "AI Copilot", href: "/chat" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-8 py-3.5 transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-3 w-3 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform duration-300 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span className="font-mono text-sm font-bold tracking-wider uppercase text-zinc-200 group-hover:text-white transition-colors">
              Cognitive Workspace
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    isActive
                      ? "bg-zinc-800 text-white shadow-xs"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side status & action */}
        <div className="flex items-center gap-3">
          {/* Backend Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/80 text-[11px] font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                backendStatus === "online"
                  ? "bg-emerald-400 animate-pulse"
                  : backendStatus === "checking"
                  ? "bg-yellow-400"
                  : "bg-red-400"
              }`}
            />
            <span className="text-zinc-400">API:</span>
            <span
              className={
                backendStatus === "online"
                  ? "text-emerald-400 font-semibold"
                  : backendStatus === "checking"
                  ? "text-yellow-400"
                  : "text-red-400"
              }
            >
              {backendStatus === "online" ? "Online" : backendStatus === "checking" ? "Checking..." : "Offline"}
            </span>
          </div>

          {/* New Project Link */}
          <Link
            href="/projects"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Manage Projects
          </Link>
        </div>
      </div>

      {/* Mobile Nav strip */}
      <div className="flex md:hidden items-center justify-around mt-2 pt-2 border-t border-zinc-800/60">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2 py-1 text-xs font-medium rounded ${
                isActive ? "text-indigo-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
