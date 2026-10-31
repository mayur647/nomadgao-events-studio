import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BRANDS, COMMUNITY_TAG, LOCATIONS, eventType, type BrandId, type LocationId } from "@/lib/constants";
import { dateShort, dayName, feeText, timeRange, venueLine } from "@/lib/format";
import type { EventRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const VOICE = `You write social captions for NomadGao and The Hotpot House.

NomadGao: a coworking + coliving community for digital nomads, remote workers and founders in India, founded by Mayur and Joy.
Locations: NomadGao Villa Nova in Anjuna, North Goa (beach, sunsets, palm trees) and NomadGao Dharamkot, above McLeod Ganj in Himachal (Dhauladhar mountains, deodar forest, Tibetan culture).
Voice: warm, playful, inclusive, a little cheeky, never corporate. "Find your tribe." Past posts say things like "Hello coconuts!!", "be your silliest on karaoke nights!", "Entry free. Popcorn on the house. BYOB. Limited seats. RSVP to confirm."
The Hotpot House (Dharamkot, @thehotpothouse): a healthy, social Asian cafe. Hotpot is the hero: people sit around one bubbling pot and eat together. Communal, friendly yet professional. Mountain views.

Rules:
- English only. Simple, natural sentences. No clichés like "unforgettable", "vibrant", "don't miss out", "elevate".
- Never invent facts. Use only the details given: name, date, time, venue, fee, RSVP, host, what to bring, BYOB, seats, audience.
- Keep every date, time, price and RSVP link exactly as given.
- instagram: a hook line, 1–2 short lines about the event, then details with emoji bullets (🗓 📍 🎟), then how to RSVP. Links are not clickable on Instagram, so say "link in bio" or "DM us" instead of pasting the RSVP URL. End with the brand handle(s) and EXACTLY the hashtags provided (Instagram allows at most 5).
- whatsapp: short. *bold* the event name (WhatsApp markdown). Details on separate lines with emojis. Paste the RSVP URL in full if there is one. No hashtags.
- community: for a local neighbourhood group. Friendly invite that makes clear locals and travellers are welcome (unless residents only). Plain details. RSVP URL in full if there is one. No hashtags, few emojis.
- For a weekly calendar: one line per event (day, date, name, time, fee), grouped by location when there are two.

Return JSON: {"instagram": string, "whatsapp": string, "community": string}`;

function describe(e: EventRow & { rsvp_url?: string | null }) {
  const t = eventType(e.event_type);
  const lines = [
    `Event: ${e.name} (${t.name} ${t.emoji})`,
    `Location: ${LOCATIONS[e.location].place}`,
    `Brands: ${(e.brands ?? ["nomadgao"]).map((b) => `${BRANDS[b as BrandId].name} ${BRANDS[b as BrandId].handle}`).join(" + ")}`,
    `When: ${dayName(e.event_date)}, ${dateShort(e.event_date)}${timeRange(e) ? `, ${timeRange(e)}` : ""}`,
    `Where: ${venueLine(e)}`,
    `Entry: ${feeText(e)}${e.fee_note && e.fee_type !== "custom" ? ` (${e.fee_note})` : ""}`,
    e.rsvp_mode === "none" ? "RSVP: not needed, walk in" : e.rsvp_mode === "phone" ? `RSVP: WhatsApp ${e.rsvp_phone}` : `RSVP URL: ${e.rsvp_url}`,
    e.host ? `Host: ${e.host}` : "",
    e.description ? `Description: ${e.description}` : "",
    e.what_to_bring ? `Bring: ${e.what_to_bring}` : "",
    e.byob ? "BYOB: yes" : "",
    e.limited_seats ? `Limited seats${e.capacity ? `: ${e.capacity}` : ""}` : "",
    e.audience === "residents" ? "Audience: NomadGao residents only" : "Audience: open to all",
  ];
  return lines.filter(Boolean).join("\n");
}

async function callGemini(model: string, key: string, prompt: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: VOICE }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: { instagram: { type: "STRING" }, whatsapp: { type: "STRING" }, community: { type: "STRING" } },
          required: ["instagram", "whatsapp", "community"],
        },
      },
    }),
  });
  return res;
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "AI captions aren't set up yet. Add GEMINI_API_KEY in Vercel. The template captions still work." }, { status: 503 });

  // Only signed-in, approved team members can use the AI.
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!token || !url || !anon) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const supa = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: u } = await supa.auth.getUser(token);
  if (!u.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { data: prof } = await supa.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (!prof || !["admin", "manager"].includes(prof.role)) return NextResponse.json({ error: "Your account isn't approved yet." }, { status: 403 });

  const body = (await req.json()) as {
    kind: "event" | "location" | "joint";
    weekLabel: string;
    location: LocationId | "both";
    events: (EventRow & { rsvp_url?: string | null })[];
    draft?: Record<string, string>;
  };
  if (!body.events?.length) return NextResponse.json({ error: "No events to write about." }, { status: 400 });

  const evs = body.events.slice(0, 30);
  let tags: string;
  if (body.kind === "event") {
    const e = evs[0];
    const brands = (e.brands?.length ? e.brands : ["nomadgao"]) as BrandId[];
    const loc = LOCATIONS[e.location].hashtags;
    tags = [...new Set([brands.includes("hotpot") && !brands.includes("nomadgao") ? "#TheHotpotHouse" : "#NomadGao", ...(brands.length > 1 ? ["#TheHotpotHouse"] : []), loc[0], eventType(e.event_type).hashtag, loc[1], COMMUNITY_TAG])].slice(0, 5).join(" ");
  } else if (body.location === "both") tags = "#NomadGao #AnjunaGoa #Dharamkot #DigitalNomadIndia #CoworkingIndia";
  else tags = ["#NomadGao", ...LOCATIONS[body.location].hashtags.slice(0, 3), COMMUNITY_TAG].join(" ");

  const prompt = [
    body.kind === "event" ? "Write captions for this single event poster." : `Write captions for the weekly calendar (${body.weekLabel}) ${body.location === "both" ? "covering both Goa and Dharamkot" : `for ${LOCATIONS[body.location as LocationId].name}`}.`,
    `Hashtags to use on Instagram (exactly these): ${tags}`,
    "",
    evs.map(describe).join("\n\n"),
    "",
    "Write something fresh. Do not copy this earlier draft:",
    body.draft?.instagram?.slice(0, 600) ?? "",
  ].join("\n");

  const preferred = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const models = [...new Set([preferred, "gemini-2.5-flash", "gemini-2.0-flash"])];
  let last = "";
  for (const m of models) {
    try {
      const res = await callGemini(m, key, prompt);
      if (res.status === 404) {
        last = `Model ${m} not found`;
        continue;
      }
      const json = await res.json();
      if (!res.ok) {
        last = json?.error?.message ?? `Gemini error ${res.status}`;
        if (res.status === 429) break;
        continue;
      }
      const text: string = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      const parsed = JSON.parse(text);
      if (!parsed.instagram || !parsed.whatsapp || !parsed.community) throw new Error("Incomplete answer");
      try {
        await supa.from("generations").insert({ user_id: u.user.id, kind: "caption_ai", action: "ai", location: body.location, template: m, count: 1 });
      } catch {}
      return NextResponse.json({ captions: parsed, model: m });
    } catch (e) {
      last = (e as Error).message;
    }
  }
  const friendly = /quota|429|rate/i.test(last) ? "The free Gemini limit is used up for now. Try again in a minute, or use the template captions." : `AI captions failed: ${last}`;
  return NextResponse.json({ error: friendly }, { status: 502 });
}
