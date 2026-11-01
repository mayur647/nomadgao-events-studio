import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/serverAuth";

export const runtime = "nodejs";

/** Fetches a Google Sheet shared as "Anyone with the link can view" and returns it as CSV. */
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { url } = (await req.json()) as { url?: string };
  const m = (url ?? "").match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  if (!m) return NextResponse.json({ error: "Paste the link of a Google Sheet (docs.google.com/spreadsheets/…)." }, { status: 400 });
  const gid = (url ?? "").match(/[#&?]gid=(\d+)/)?.[1];
  const exportUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
  const res = await fetch(exportUrl, { redirect: "follow" });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || type.includes("text/html")) {
    return NextResponse.json({ error: "Couldn't open that sheet. In Google Sheets click Share → General access → \"Anyone with the link\" (Viewer), then try again." }, { status: 400 });
  }
  const csv = await res.text();
  return NextResponse.json({ csv: csv.slice(0, 500_000) });
}
