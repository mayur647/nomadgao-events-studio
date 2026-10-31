"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";

export default function ResetPage() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form
        className="card p-6 w-full max-w-sm space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await sb().auth.updateUser({ password: pw });
          if (error) setMsg(error.message);
          else router.replace("/");
        }}
      >
        <h1 className="font-display text-2xl font-extrabold">Set a new password</h1>
        <input type="password" className="input" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="new-password" />
        {msg && <p className="text-sm text-chili">{msg}</p>}
        <button className="btn-primary w-full">Save password</button>
      </form>
    </main>
  );
}
