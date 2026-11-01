import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/serverAuth";
import { GeminiError, geminiJSON, type Part } from "@/lib/gemini";
import { AI_EVENT_SCHEMA, aiInstructions, type ImportContext, type RawEvent } from "@/lib/importer";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMAGE = /^image\/(jpeg|png|webp|heic|heif)$/;
const AUDIO = /^audio\/(wav|x-wav|mpeg|mp3|ogg|flac|aac|webm)$/;

/**
 * Reads events out of a photo of handwritten notes, a voice recording, or free text.
 * Body: { kind: "text" | "image" | "audio", text?, mime?, data? (base64), ctx: ImportContext }
 */
export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { kind: "text" | "image" | "audio"; text?: string; mime?: string; data?: string; ctx: ImportContext };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "That upload is too big. Use a smaller photo or a shorter recording." }, { status: 413 });
  }
  const { kind, ctx } = body;
  if (!ctx?.week || !ctx?.location) return NextResponse.json({ error: "Pick a week and location first." }, { status: 400 });

  const parts: Part[] = [];
  if (kind === "text") {
    const t = (body.text ?? "").trim();
    if (t.length < 4) return NextResponse.json({ error: "Type or paste the events first." }, { status: 400 });
    parts.push({ text: `Here are the plans:\n\n${t.slice(0, 20000)}` });
  } else if (kind === "image" || kind === "audio") {
    const mime = body.mime ?? "";
    if (kind === "image" && !IMAGE.test(mime)) return NextResponse.json({ error: "Use a JPG or PNG photo." }, { status: 400 });
    if (kind === "audio" && !AUDIO.test(mime)) return NextResponse.json({ error: "That recording format isn't supported." }, { status: 400 });
    if (!body.data || body.data.length > 4_000_000) return NextResponse.json({ error: "That file is too big. Use a smaller photo or a shorter recording." }, { status: 413 });
    parts.push({ inlineData: { mimeType: mime.replace("x-wav", "wav"), data: body.data } });
    parts.push({ text: kind === "image" ? "This is a photo of our event plans (may be handwritten). Extract every event." : "This is a voice note describing our event plans. Extract every event." });
  } else return NextResponse.json({ error: "Unknown input." }, { status: 400 });

  try {
    const { data, model } = await geminiJSON<{ events: RawEvent[] }>({ system: aiInstructions(ctx), parts, schema: AI_EVENT_SCHEMA, temperature: 0.1 });
    try {
      await auth.supa.from("generations").insert({ user_id: auth.user.id, kind: "import_ai", action: kind, location: ctx.location, template: model, count: data.events?.length ?? 0 });
    } catch {}
    return NextResponse.json({ events: data.events ?? [] });
  } catch (e) {
    const err = e as GeminiError;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 502 });
  }
}
