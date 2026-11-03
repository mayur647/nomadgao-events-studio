import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/serverAuth";
import { GeminiError, geminiJSON } from "@/lib/gemini";
import { BRANDS, COMMUNITY_TAG, LOCATIONS, eventType, type BrandId, type LocationId } from "@/lib/constants";
import { dateShort, dayName, feeText, timeRange, venueLine } from "@/lib/format";
import type { EventRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const VOICE = `You write social captions for NomadGao and The Hotpot House.

WHO WE ARE
NomadGao is a coworking + coliving community for digital nomads, remote workers and founders in India, founded by Mayur and Joy. Two homes:
- NomadGao Villa Nova in Anjuna, North Goa: beach, palm trees, golden-hour sunsets, slow Goan days after deep work.
- NomadGao Dharamkot, above McLeod Ganj in Himachal: the Dhauladhar mountains, deodar forest, Tibetan culture, cosy mountain evenings.
The Hotpot House (Dharamkot, @thehotpothouse): a healthy, social Asian cafe. Hotpot is the hero: people sit around one bubbling pot and eat together. Communal, friendly yet professional.

PERSONALITY
Warm, community-first, playful, a little cheeky, never corporate. We write like a friend inviting you along, not a venue advertising. "Find your tribe." Our big idea: people arrive alone and leave with friends. Past posts say things like "Hello coconuts!!", "be your silliest on karaoke nights!".
Every caption should make a newcomer feel personally welcome: say that coming solo is normal, that nomads, locals and travellers all belong (unless residents only), and paint what the evening will FEEL like (the people, the laughter, the conversations), not just what it is.
Use a touch of place (Anjuna sunsets, the hills, the Dhauladhars) only when it fits the time of day: no "sunset" for a 9 AM event.

RULES
- English only. Simple, natural sentences. No clichés like "unforgettable", "vibrant", "don't miss out", "elevate", "curated", "immersive".
- Never invent facts: no free drinks, food, prizes, music, numbers or activities that aren't in the details. Use only: name, date, time, venue, fee, RSVP, host, description, what to bring, BYOB, seats, audience.
- Keep every date, time, price and RSVP link exactly as given.
- Vary the opening; don't always start with the greeting.

FORMAT
- instagram (120–200 words): a scroll-stopping first line, then 2–3 short warm paragraphs (what it'll feel like, who it's for, a welcome for first-timers), then details with emoji bullets (🗓 📍 🎟 and any of ⚠️ 🍾 🎒 🙋), then how to RSVP and a friendly sign-off. Links aren't clickable on Instagram, so say "link in bio" or "DM us" instead of the URL. End with the brand handle(s) and EXACTLY the hashtags provided (Instagram allows at most 5).
- whatsapp (60–110 words): *bold* event name (WhatsApp markdown), an italic one-line hook, 2 warm sentences, details on separate lines with emojis, the full RSVP URL if there is one, a short sign-off. No hashtags.
- community (80–140 words): a neighbourly invite for a local group. Open with "Hi everyone" style greeting, 2 warm sentences, make clear locals, travellers and nomads are welcome and coming alone is normal (unless residents only), plain When/Where/Entry lines, full RSVP URL if there is one, signed by the team. No hashtags, few emojis.
- For a weekly calendar: a warm 1–2 sentence intro, one line per event (emoji, day, date, name, time, fee) grouped by location when there are two, then a welcoming closer. Instagram adds "save this post / tag a friend" and the hashtags.

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
