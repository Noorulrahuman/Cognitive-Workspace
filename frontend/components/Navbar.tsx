"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type BackendStatus = "online" | "offline" | "checking";

const NAV_ITEMS = [
  { name: "Overview", href: "/" },
  { name: "Projects", href: "/projects" },
  { name: "Requirements", href: "/requirements" },
  { name: "Gemini AI", href: "/chat" },
];

const STATUS_STYLES: Record<
  BackendStatus,
  { dot: string; text: string; label: string }
> = {
  online: {
    dot: "bg-emerald-400 animate-pulse",
    text: "text-emerald-400 font-semibold",
    label: "Online",
  },
  checking: { dot: "bg-yellow-400", text: "text-yellow-400", label: "..." },
  offline: { dot: "bg-red-400", text: "text-red-400", label: "Offline" },
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase() || "CW";
}

function useBackendStatus(intervalMs = 10000): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let isMounted = true;

    async function check() {
      if (document.hidden) return; // tab background-la irundha skip
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(`${API_URL}/api/v1/health`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (isMounted) setStatus(res.ok ? "online" : "offline");
      } catch {
        if (isMounted) setStatus("offline");
      } finally {
        clearTimeout(timeout);
      }
    }

    check();
    const id = setInterval(check, intervalMs);
    const onVisible = () => {
      if (!document.hidden) check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      isMounted = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return status;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const backendStatus = useBackendStatus();
  const statusStyle = STATUS_STYLES[backendStatus];

  const userDisplayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-8 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand + desktop links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-3 w-3 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform duration-300 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span className="font-mono text-sm font-bold tracking-wider uppercase text-zinc-200 group-hover:text-white transition-colors">
              Cognitive Workspace
            </span>
          </Link>

          <nav aria-label="Main" className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    active
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

        {/* Right side: status + auth */}
        <div className="flex items-center gap-3">
          <div
            role="status"
            aria-live="polite"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/80 text-[11px] font-mono"
          >
            <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
            <span className="text-zinc-400">API:</span>
            <span className={statusStyle.text}>{statusStyle.label}</span>
          </div>

          {authLoading ? (
            <div className="h-8 w-28 animate-pulse rounded-lg bg-zinc-900" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/90 text-xs">
                <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                  {getInitials(userDisplayName)}
                </div>
                <span className="hidden lg:inline text-zinc-300 font-medium text-xs max-w-[130px] truncate">
                  {userDisplayName}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-2.5 py-1 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  pathname === "/login"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800"
                }`}
              >
                Sign In
              </Link>
              <Link
                href="/login?tab=register"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav strip */}
      <nav
        aria-label="Mobile"
        className="flex md:hidden items-center justify-around mt-2 pt-2 border-t border-zinc-800/60"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`px-2 py-1 text-xs font-medium rounded ${
                active
                  ? "text-indigo-400 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}