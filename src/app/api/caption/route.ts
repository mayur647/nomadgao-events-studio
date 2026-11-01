import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/serverAuth";
import { GeminiError, geminiJSON } from "@/lib/gemini";
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

export async function POST(req: Request) {
  const auth = await requireStaff(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supa, user } = auth;

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

  try {
    const { data, model } = await geminiJSON<{ instagram: string; whatsapp: string; community: string }>({
      system: VOICE,
      parts: [{ text: prompt }],
      temperature: 0.9,
      schema: {
        type: "OBJECT",
        properties: { instagram: { type: "STRING" }, whatsapp: { type: "STRING" }, community: { type: "STRING" } },
        required: ["instagram", "whatsapp", "community"],
      },
    });
    if (!data.instagram || !data.whatsapp || !data.community) throw new GeminiError("The AI gave an incomplete answer. Try again.");
    try {
      await supa.from("generations").insert({ user_id: user.id, kind: "caption_ai", action: "ai", location: body.location, template: model, count: 1 });
    } catch {}
    return NextResponse.json({ captions: data, model });
  } catch (e) {
    const err = e as GeminiError;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 502 });
  }
}
