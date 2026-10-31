"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isConfigured = Boolean(SUPABASE_URL && ANON);

export function sb(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL || "http://localhost:54321", ANON || "missing", {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

export function publicUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("/")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/media/${path}`;
}
