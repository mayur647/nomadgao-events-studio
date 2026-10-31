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
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="font-display text-2xl font-extrabold">{mode === "in" ? "Sign in" : "Create your account"}</h2>
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
      </section>
    </main>
  );
}
