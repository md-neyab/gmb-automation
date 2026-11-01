"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Lock, Mail, ShieldCheck, Sparkles, UserPlus } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasDatabase, setHasDatabase] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passkey, setPasskey] = useState("");
  const [usePasskey, setUsePasskey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/login");
        if (res.ok) {
          const data = await res.json();
          setNeedsSetup(data.needsSetup === true);
          setHasDatabase(data.hasDatabase !== false);
          if (!data.hasDatabase) {
            setUsePasskey(true);
          }
        }
      } catch {
        // Ignore
      }
    }
    checkStatus();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {};
      if (needsSetup) {
        payload.isSetup = true;
        payload.email = email;
        payload.password = password;
      } else if (usePasskey || !hasDatabase) {
        payload.passkey = passkey || "pinpilot-admin";
      } else {
        payload.email = email;
        payload.password = password;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Authentication failed. Please verify your credentials.");
        setIsSubmitting(false);
        return;
      }

      router.push(data.redirect ?? "/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-16 text-zinc-50 select-none">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-md">
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                PinPilot Security
              </span>
              <h1 className="text-lg font-bold tracking-tight text-zinc-100">
                {needsSetup ? "Create Admin Account" : "Administrator Sign In"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{hasDatabase ? "MongoDB Ready" : "Local Mode"}</span>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-3.5 text-xs text-zinc-400 leading-relaxed">
          {needsSetup ? (
            <p className="flex items-center gap-2 text-zinc-300">
              <UserPlus className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                First-time setup detected. Create your initial admin credentials below to secure your
                PinPilot instance.
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-2 text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Access verified Google Business Profile command center for Goals Floors.</span>
            </p>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {!usePasskey && hasDatabase ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-300">Admin Email</span>
                <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 focus-within:border-zinc-700 transition">
                  <Mail className="h-4 w-4 text-zinc-500 shrink-0" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                    placeholder="admin@goalsfloors.com"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-300">Password</span>
                <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 focus-within:border-zinc-700 transition">
                  <Lock className="h-4 w-4 text-zinc-500 shrink-0" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                    placeholder={needsSetup ? "Choose a secure password (min 6 chars)" : "Enter password"}
                  />
                </div>
              </label>
            </>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-300">Admin Passkey</span>
              <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 focus-within:border-zinc-700 transition">
                <Fingerprint className="h-4 w-4 text-zinc-500 shrink-0" />
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                  placeholder="Enter administrator passkey"
                />
              </div>
            </label>
          )}

          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-zinc-100 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
          >
            {isSubmitting
              ? "Authenticating..."
              : needsSetup
                ? "Create Admin Account & Unlock"
                : "Sign In to Dashboard"}
          </button>
        </form>

        {/* Fallback Mode Toggle */}
        {hasDatabase && !needsSetup && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setUsePasskey(!usePasskey);
                setError("");
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
            >
              {usePasskey ? "← Use Email & Password" : "Use Passkey Fallback →"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
