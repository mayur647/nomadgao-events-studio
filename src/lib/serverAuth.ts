import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

/** Checks the caller is a signed-in, approved team member. Returns a Supabase client acting as them. */
export async function requireStaff(req: Request): Promise<{ supa: SupabaseClient; user: User } | { error: string; status: number }> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return { error: "Please sign in again.", status: 401 };
  const supa = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: u } = await supa.auth.getUser(token);
  if (!u.user) return { error: "Please sign in again.", status: 401 };
  const { data: prof } = await supa.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (!prof || !["admin", "manager"].includes(prof.role)) return { error: "Your account isn't approved yet.", status: 403 };
  return { supa, user: u.user };
}
