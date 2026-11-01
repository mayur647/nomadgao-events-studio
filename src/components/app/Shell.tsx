"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { isConfigured } from "@/lib/supabase";
import { isStaff, useAuth } from "./Auth";

const NAV = [
  { href: "/", label: "Studio" },
  { href: "/events", label: "Events" },
  { href: "/import", label: "Import" },
  { href: "/gallery", label: "Photo gallery" },
  { href: "/admin", label: "Admin", admin: true },
];

export function SetupNeeded() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="font-display text-3xl font-extrabold mb-3">Almost there</h1>
      <p className="mb-4">The app isn&apos;t connected to its database yet. Add these in Vercel → Project → Settings → Environment Variables, then redeploy:</p>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
        <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
        <li><code>GEMINI_API_KEY</code> (optional, for AI captions)</li>
      </ul>
      <p className="mt-6 text-sm">
        Meanwhile you can look at the <Link className="underline" href="/samples">sample posters</Link>.
      </p>
    </main>
  );
}

export function Shell({ children, adminOnly = false, wide = false }: { children: ReactNode; adminOnly?: boolean; wide?: boolean }) {
  const { session, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (loading || !isConfigured) return;
    if (!session) router.replace(`/login?next=${encodeURIComponent(path)}`);
    else if (profile && !isStaff(profile)) router.replace("/pending");
    else if (profile && adminOnly && profile.role !== "admin") router.replace("/");
  }, [loading, session, profile, adminOnly, router, path]);

  if (!isConfigured) return <SetupNeeded />;
  if (loading || !session || !profile || !isStaff(profile) || (adminOnly && profile.role !== "admin")) {
    return <div className="min-h-screen grid place-items-center text-mute">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="bg-moss text-white">
        <div className={`mx-auto ${wide ? "max-w-7xl" : "max-w-5xl"} px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2`}>
          <Link href="/" className="flex items-center gap-3 mr-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/nomadgao-white.png" alt="NomadGao" className="h-6 w-auto" />
            <span className="font-hand text-2xl text-matcha leading-none">events studio</span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV.filter((n) => !n.admin || profile.role === "admin").map((n) => {
              const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-1.5 font-medium ${on ? "bg-white/15 text-white" : "text-white/75 hover:text-white"}`}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-white/75 hidden sm:inline">
              {profile.full_name || profile.email} · {profile.role === "admin" ? "Admin" : "Community manager"}
            </span>
            <button className="rounded-lg border border-white/25 px-3 py-1.5 font-medium hover:bg-white/10" onClick={() => signOut().then(() => router.replace("/login"))}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className={`mx-auto ${wide ? "max-w-7xl" : "max-w-5xl"} px-4 py-6 sm:py-8`}>{children}</main>
    </div>
  );
}
