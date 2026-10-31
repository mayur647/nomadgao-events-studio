"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isConfigured, sb } from "@/lib/supabase";
import { isStaff, useAuth } from "@/components/app/Auth";
import { SetupNeeded } from "@/components/app/Shell";

export default function LoginPage() {
  const router = useRouter();
  const { session, profile, refresh } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  useEffect(() => {
    if (session && profile) {
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      router.replace(isStaff(profile) ? next : "/pending");
    }
  }, [session, profile, router]);

  if (!isConfigured) return <SetupNeeded />;

  async function google() {
    setBusy(true);
    setMsg(null);
    const next = new URLSearchParams(window.location.search).get("next") || "/";
    const { error } = await sb().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}`, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setBusy(false);
      setMsg({ text: error.message.includes("provider is not enabled") ? "Google sign-in isn't switched on in Supabase yet." : error.message, err: true });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await refresh();
      } else {
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        const { data, error } = await sb().auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } });
        if (error) throw error;
        if (!data.session) setMsg({ text: "Check your inbox to confirm your email, then sign in here." });
      }
    } catch (err) {
      const m = (err as Error).message;
      setMsg({ text: m.includes("Invalid login") ? "That email and password don't match. Try again or reset your password." : m, err: true });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!email.trim()) return setMsg({ text: "Type your email above first, then press Forgot password.", err: true });
    const { error } = await sb().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset` });
    setMsg(error ? { text: error.message, err: true } : { text: "We've sent you a link to set a new password." });
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="bg-moss text-white p-8 sm:p-12 flex flex-col justify-between gap-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/nomadgao-white.png" alt="NomadGao" className="h-9 w-auto self-start" />
        <div>
          <p className="font-hand text-4xl text-matcha mb-2">events studio</p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-[1.05] max-w-md">Fill the form once. Get every poster, calendar and caption for the week.</h1>
          <p className="mt-5 text-white/75 max-w-md">For the NomadGao and Hotpot House teams in Goa and Dharamkot.</p>
        </div>
        <div className="flex items-center gap-4 text-white/60 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/hotpot-house.png" alt="The Hotpot House" className="h-12 w-12 rounded-full" />
          Anjuna · Dharamkot
        </div>
      </section>
      <section className="p-6 sm:p-12 grid place-items-center">
        <div className="w-full max-w-sm space-y-5">
          <h2 className="font-display text-2xl font-extrabold">Sign in</h2>
          <button type="button" onClick={google} disabled={busy} className="btn w-full border border-line bg-white text-ink hover:bg-matcha-soft !py-3 text-base">
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Continue with Google
          </button>
          {msg && !showEmail && <p className={`text-sm ${msg.err ? "text-chili" : "text-moss"}`}>{msg.text}</p>}
          <p className="hint">First time? Sign in with Google and an admin will approve your account.</p>
          {!showEmail && (
            <button type="button" className="text-sm underline text-mute" onClick={() => setShowEmail(true)}>
              Use email and password instead
            </button>
          )}
        {showEmail && (
        <form onSubmit={submit} className="space-y-4 border-t border-line pt-5">
          <h3 className="font-semibold">{mode === "in" ? "Sign in with email" : "Create an account with email"}</h3>
          {mode === "up" && (
            <div>
              <label className="label" htmlFor="name">Your name</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="pw">Password</label>
            <input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {msg && <p className={`text-sm ${msg.err ? "text-chili" : "text-moss"}`}>{msg.text}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" className="underline text-mute" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
            </button>
            {mode === "in" && (
              <button type="button" className="underline text-mute" onClick={reset}>
                Forgot password
              </button>
            )}
          </div>
          {mode === "up" && <p className="hint">An admin approves new accounts before you can make posters.</p>}
        </form>
        )}
        </div>
      </section>
    </main>
  );
}
