"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isStaff, useAuth } from "@/components/app/Auth";

export default function PendingPage() {
  const { session, profile, loading, refresh, signOut } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (isStaff(profile)) router.replace("/");
  }, [loading, session, profile, router]);
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="card p-8 max-w-md text-center space-y-4">
        <p className="font-hand text-3xl text-moss">almost in</p>
        <h1 className="font-display text-2xl font-extrabold">{profile?.role === "disabled" ? "Your account is switched off" : "Waiting for an admin to approve you"}</h1>
        <p className="text-mute">
          {profile?.role === "disabled" ? "Ask an admin if you need access again." : "Ask Mayur (or another admin) to approve your account in the Admin page. Then press the button below."}
        </p>
        <div className="flex gap-3 justify-center">
          <button className="btn-primary" onClick={() => refresh()}>I&apos;ve been approved</button>
          <button className="btn-ghost" onClick={() => signOut().then(() => router.replace("/login"))}>Sign out</button>
        </div>
      </div>
    </main>
  );
}
