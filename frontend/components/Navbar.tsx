"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";

/* ==========================================================================
 * Navbar: Industry-grade Top Navigation Bar
 *
 * Left side  : Gold glowing brand + main navigation links
 *              (Requirements replaced with Members & Tasks; Copilot renamed to Gemini)
 * Right side : Bundled top-right menu trigger (Menu Icon + User Profile)
 *              Once clicked, reveals Profile, Sign In / Sign Out, Settings,
 *              API & Database health, and quick workspace shortcuts.
 * ========================================================================== */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type BackendStatus = "online" | "offline" | "checking";

const NAV_ITEMS = [
  { name: "Overview", href: "/" },
  { name: "Projects", href: "/projects" },
  { name: "Members", href: "/members" },
  { name: "Gemini", href: "/chat" },
];

const STATUS_STYLES: Record<
  BackendStatus,
  { dot: string; text: string; label: string }
> = {
  online: {
    dot: "bg-emerald-400 animate-pulse",
    text: "text-emerald-400 font-semibold",
    label: "Online (Healthy)",
  },
  checking: { dot: "bg-yellow-400", text: "text-yellow-400", label: "Checking..." },
  offline: { dot: "bg-red-400", text: "text-red-400", label: "Offline (Local Cache)" },
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

function useBackendStatus(intervalMs = 15000): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let isMounted = true;

    async function check() {
      if (document.hidden) return;
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

  // Bundled menu state
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"menu" | "settings">("menu");
  const [accentTheme, setAccentTheme] = useState<string>("indigo");
  const [soundAlerts, setSoundAlerts] = useState<boolean>(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const userDisplayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Workspace Member";
  const userEmail = user?.email || "guest@cognitive-workspace.local";

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut();
    router.push("/login");
    router.refresh();
  };

  // Close menu on click outside or Esc
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isMenuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md px-4 sm:px-8 py-3 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* ===== LEFT: Brand + Main Links ===== */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-3 w-3 rounded-full bg-amber-400 group-hover:scale-125 transition-transform duration-300 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
            <span className="font-mono text-sm font-bold tracking-wider uppercase bg-linear-to-r from-amber-500 via-yellow-200 to-amber-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-gold-shimmer drop-shadow-[0_0_8px_rgba(251,191,36,0.35)] group-hover:drop-shadow-[0_0_14px_rgba(251,191,36,0.65)] transition-all duration-300">
              Cognitive Workspace
            </span>
          </Link>

          {/* Desktop Links */}
          <nav aria-label="Main" className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    active
                      ? "bg-zinc-800 text-white shadow-xs font-semibold"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ===== RIGHT: Bundled Menu (Menu Icon + User Profile on normal state) ===== */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-label="Open Workspace Menu & Settings"
            className={`group flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-full border transition-all cursor-pointer ${
              isMenuOpen
                ? "border-indigo-500/60 bg-zinc-800/90 text-white ring-2 ring-indigo-500/20"
                : "border-zinc-800 bg-zinc-900/90 hover:border-zinc-700 hover:bg-zinc-850 text-zinc-300"
            }`}
          >
            {/* 1. Menu Icon */}
            <div className="flex flex-col justify-center items-center w-4 h-4 text-zinc-400 group-hover:text-zinc-100 transition-colors">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>

            {/* Subtle Divider */}
            <div className="w-[1px] h-4 bg-zinc-800" />

            {/* 2. User Profile on normal */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="h-7 w-7 rounded-full bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-[11px] font-bold text-white shadow-xs">
                  {user ? getInitials(userDisplayName) : "CW"}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 ${
                    user ? "bg-emerald-400" : "bg-zinc-500"
                  }`}
                />
              </div>

              <span className="hidden sm:inline-block text-xs font-medium text-zinc-200 max-w-[110px] truncate">
                {user ? userDisplayName : "Guest Member"}
              </span>

              {/* Chevron */}
              <svg
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  isMenuOpen ? "rotate-180 text-indigo-400" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* ===== BUNDLED DROPDOWN MENU (Once clicked, reveals everything) ===== */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2.5 w-84 sm:w-96 rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl p-4 shadow-2xl z-50 animate-scale-up text-zinc-100">
              {/* Header: User Profile Info */}
              <div className="flex items-start gap-3 pb-3 border-b border-zinc-800/80">
                <div className="h-11 w-11 rounded-full bg-linear-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center text-sm font-bold text-white shadow-md">
                  {user ? getInitials(userDisplayName) : "CW"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate">
                      {user ? userDisplayName : "Guest Member"}
                    </p>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                      {user ? "Authenticated" : "Preview"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono truncate">{userEmail}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Workspace Active</span>
                  </div>
                </div>
              </div>

              {/* Account Settings link (only when signed in) */}
              {user && (
                <div className="mt-3">
                  <Link
                    href="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Account Settings</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">&rarr;</span>
                  </Link>
                </div>
              )}



              {/* Bottom Actions: Sign In / Register / Sign Out */}
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-rose-900/40 bg-rose-950/20 hover:bg-rose-900/40 text-xs font-semibold text-rose-300 transition cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <div className="w-full grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center py-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition text-center"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/login?tab=register"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 transition text-center"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MOBILE: Navigation Row ===== */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden items-center justify-around mt-2.5 pt-2 border-t border-zinc-800/60"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`px-2 py-1 text-xs font-medium rounded transition ${
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