"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CognitiveLogo from "@/components/CognitiveLogo";
import OwlLoader from "@/components/OwlLoader";
import { useAccent } from "@/components/AccentColorProvider";
import { createClient } from "@/utils/supabase/client";

export const dynamic = "force-dynamic";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/projects";
  const { accentColor } = useAccent();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sign In inputs
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign Up inputs
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  // Forgot Password modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data?.user) {
        router.push(nextUrl);
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (registerPassword !== registerConfirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    if (registerPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerEmail.trim(),
        password: registerPassword,
        options: {
          data: {
            full_name: registerName.trim(),
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data?.user) {
        if (data.session) {
          router.push(nextUrl);
          router.refresh();
        } else {
          setSuccessMessage(
            "Account created! Please check your email inbox to confirm your registration."
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotSuccess(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setForgotSuccess("Password reset email sent! Check your inbox.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset email";
      setErrorMessage(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 relative bg-black text-zinc-100">
      <div className="w-full max-w-sm relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex flex-col items-center gap-2 mb-2 group">
            <CognitiveLogo size="md" variant="icon" />
            <span className="font-mono text-base font-bold tracking-wider uppercase bg-linear-to-r from-amber-500 via-yellow-200 to-amber-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-gold-shimmer drop-shadow-[0_0_8px_rgba(251,191,36,0.35)] transition-all">
              Cognitive Workspace
            </span>
          </Link>
          <p className="text-xs text-zinc-400">
            {activeTab === "login" ? "Sign in to your workspace" : "Create a workspace account"}
          </p>
        </div>

        {/* Minimal Black & Accent Card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-6 backdrop-blur-xl shadow-2xl">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={
                activeTab === "login"
                  ? { backgroundColor: "var(--accent-color)", color: "#000000" }
                  : {}
              }
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "login"
                  ? "font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={
                activeTab === "register"
                  ? { backgroundColor: "var(--accent-color)", color: "#000000" }
                  : {}
              }
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "register"
                  ? "font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl border border-red-500/40 bg-red-950/30 text-red-300 text-xs flex items-start gap-2">
              <span className="font-bold">⚠</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              className="mb-4 p-3 rounded-xl border text-xs flex items-start gap-2"
              style={{
                borderColor: "var(--accent-border)",
                backgroundColor: "var(--accent-subtle)",
                color: "var(--accent-text)",
              }}
            >
              <span className="font-bold">✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* SIGN IN FORM (Necessary bars only) */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-zinc-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    style={{ color: "var(--accent-color)" }}
                    className="text-[11px] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 pr-10 text-xs text-white placeholder-zinc-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: "var(--accent-color)",
                  boxShadow: "0 4px 14px var(--accent-glow)",
                }}
                className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold text-black transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In &rarr;</span>
                )}
              </button>
            </form>
          )}

          {/* CREATE ACCOUNT FORM (Necessary bars only) */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Subburaj K"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Create password (8+ chars)"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 pr-10 text-xs text-white placeholder-zinc-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat password"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 transition-colors"
                />
                {registerConfirmPassword.length > 0 && registerPassword !== registerConfirmPassword && (
                  <p className="mt-1 text-[11px] text-red-400">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (registerConfirmPassword.length > 0 && registerPassword !== registerConfirmPassword)}
                style={{
                  backgroundColor: "var(--accent-color)",
                  boxShadow: "0 4px 14px var(--accent-glow)",
                }}
                className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold text-black transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Create Account &rarr;</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">Reset Password</h3>
              <button
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setForgotSuccess(null);
                }}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {forgotSuccess ? (
              <div
                className="mt-4 p-3 rounded-xl border text-xs"
                style={{
                  borderColor: "var(--accent-border)",
                  backgroundColor: "var(--accent-subtle)",
                  color: "var(--accent-text)",
                }}
              >
                {forgotSuccess}
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="mt-4 space-y-3.5">
                <p className="text-xs text-zinc-400">
                  Enter your email address to receive a password reset link.
                </p>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs text-white placeholder-zinc-500 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{ backgroundColor: "var(--accent-color)" }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-black shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? "Sending..." : "Send Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 bg-black">
          <OwlLoader text="Buffering Authentication..." size="md" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
