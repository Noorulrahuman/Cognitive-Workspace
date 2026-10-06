"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/AuthProvider";

function calculatePasswordStrength(pass: string): {
  score: number;
  label: string;
  hasLength: boolean;
  hasNumber: boolean;
  hasUpper: boolean;
  hasSpecial: boolean;
} {
  const hasLength = pass.length >= 8;
  const hasNumber = /\d/.test(pass);
  const hasUpper = /[A-Z]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);

  let score = 0;
  if (hasLength) score += 1;
  if (hasNumber) score += 1;
  if (hasUpper) score += 1;
  if (hasSpecial) score += 1;

  let label = "Weak";
  if (score >= 4) label = "Very Strong";
  else if (score === 3) label = "Strong";
  else if (score === 2) label = "Moderate";

  return { score, label, hasLength, hasNumber, hasUpper, hasSpecial };
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";

  const { user } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");

  // Register Form State
  const [registerName, setRegisterName] = useState<string>("");
  const [registerEmail, setRegisterEmail] = useState<string>("");
  const [registerPassword, setRegisterPassword] = useState<string>("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState<string>("");

  // Forgot Password Modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // If already logged in, redirect to projects
  useEffect(() => {
    if (user) {
      router.push("/projects");
    }
  }, [user, router]);

  const passwordStrength = calculatePasswordStrength(registerPassword);
  const passwordsMatch =
    registerPassword.length > 0 &&
    registerConfirmPassword.length > 0 &&
    registerPassword === registerConfirmPassword;

  // Handle Login Submit
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
        setLoading(false);
        return;
      }

      if (data.user) {
        setSuccessMessage("Authentication successful! Redirecting to workspace...");
        setTimeout(() => {
          router.push("/projects");
          router.refresh();
        }, 800);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (registerPassword !== registerConfirmPassword) {
      setErrorMessage("Passwords do not match. Please verify.");
      return;
    }

    if (passwordStrength.score < 2) {
      setErrorMessage("Please choose a stronger password with at least 8 characters.");
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
        setLoading(false);
        return;
      }

      if (data.user) {
        // Supabase sends a confirmation email if configured, or signs in directly
        if (data.session) {
          setSuccessMessage("Account created and logged in! Redirecting...");
          setTimeout(() => {
            router.push("/projects");
            router.refresh();
          }, 800);
        } else {
          setSuccessMessage(
            "Account registered successfully! A confirmation link has been sent to your email. You can also sign in right away if email verification is optional."
          );
          setLoading(false);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register user.";
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotSuccess(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/projects`,
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setForgotSuccess(
          `Password reset link dispatched to ${forgotEmail}. Please check your inbox.`
        );
      }
    } catch {
      setErrorMessage("Could not request password reset.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-indigo-950/30 via-zinc-950/0 to-transparent" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="h-3.5 w-3.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
            <span className="font-mono text-sm font-bold tracking-wider uppercase text-white">
              Cognitive Workspace
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {activeTab === "login" ? "Welcome back" : "Create your workspace account"}
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            {activeTab === "login"
              ? "Sign in to manage your autonomous agents and vector indexes."
              : "Register to orchestrate multi-agent pipelines and ingest documents."}
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {/* Tabs Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "login"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
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
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "register"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-start gap-2.5">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 pr-10 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
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
                className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In &rarr;</span>
                )}
              </button>
            </form>
          )}

          {/* REGISTRATION FORM */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Subburaj K"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Create a secure password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 pr-10 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
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

                {/* Password Strength Meter */}
                {registerPassword.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-zinc-400">Strength:</span>
                      <span
                        className={
                          passwordStrength.score >= 3
                            ? "text-emerald-400 font-semibold"
                            : passwordStrength.score === 2
                            ? "text-yellow-400"
                            : "text-rose-400"
                        }
                      >
                        {passwordStrength.label}
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full flex-1 rounded-full transition-all ${
                            step <= passwordStrength.score
                              ? passwordStrength.score >= 3
                                ? "bg-emerald-400"
                                : passwordStrength.score === 2
                                ? "bg-yellow-400"
                                : "bg-rose-500"
                              : "bg-zinc-800"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Check items */}
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-zinc-400 pt-1">
                      <span className={passwordStrength.hasLength ? "text-emerald-400" : "text-zinc-500"}>
                        {passwordStrength.hasLength ? "✓" : "○"} 8+ chars
                      </span>
                      <span className={passwordStrength.hasNumber ? "text-emerald-400" : "text-zinc-500"}>
                        {passwordStrength.hasNumber ? "✓" : "○"} 1+ number
                      </span>
                      <span className={passwordStrength.hasUpper ? "text-emerald-400" : "text-zinc-500"}>
                        {passwordStrength.hasUpper ? "✓" : "○"} 1+ uppercase
                      </span>
                      <span className={passwordStrength.hasSpecial ? "text-emerald-400" : "text-zinc-500"}>
                        {passwordStrength.hasSpecial ? "✓" : "○"} 1+ special
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat your password"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  className={`w-full rounded-xl border bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                    registerConfirmPassword.length > 0
                      ? passwordsMatch
                        ? "border-emerald-500/60 focus:border-emerald-500"
                        : "border-rose-500/60 focus:border-rose-500"
                      : "border-zinc-800 focus:border-indigo-500"
                  }`}
                />
                {registerConfirmPassword.length > 0 && !passwordsMatch && (
                  <p className="mt-1 text-[11px] text-rose-400">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (registerConfirmPassword.length > 0 && !passwordsMatch)}
                className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Complete Registration &rarr;</span>
                )}
              </button>
            </form>
          )}

          {/* Supabase Security Badge Footer */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
              <span>Secured by Supabase Auth & JWT</span>
            </div>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">Reset Password</h3>
              <button
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setForgotSuccess(null);
                }}
                className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {forgotSuccess ? (
              <div className="mt-4 p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs">
                {forgotSuccess}
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="mt-4 space-y-4">
                <p className="text-xs text-zinc-400">
                  Enter your account email. Supabase will dispatch a password recovery link.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? "Sending..." : "Send Reset Link"}
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
        <div className="flex-1 flex items-center justify-center p-8 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            Loading Authentication...
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
