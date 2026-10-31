import { BRANDS, COMMUNITY_TAG, LOCATIONS, eventType, type BrandId, type LocationId } from "./constants";
import { dateShort, dayName, feeText, rsvpUrl, timeRange, venueLine, weekRange } from "./format";
import { hash, pick } from "./rng";
import type { EventRow } from "./types";

export type Channel = "instagram" | "whatsapp" | "community";
export type Captions = Record<Channel, string>;
export const CHANNELS: { id: Channel; label: string; hint: string }[] = [
  { id: "instagram", label: "Instagram", hint: "Up to 5 hashtags (Instagram's limit)" },
  { id: "whatsapp", label: "WhatsApp groups", hint: "Short, with the RSVP link" },
  { id: "community", label: "Local community", hint: "Friendly invite for neighbours" },
];

/** 5 hashtags max — Instagram caps posts at five since Dec 2025. */
export function hashtags(location: LocationId, brands: BrandId[], typeSlug: string | null, seed: number) {
  const loc = LOCATIONS[location].hashtags;
  const tags: string[] = [];
  tags.push(brands.includes("hotpot") && !brands.includes("nomadgao") ? BRANDS.hotpot.hashtag : BRANDS.nomadgao.hashtag);
  if (brands.includes("hotpot") && brands.includes("nomadgao")) tags.push(BRANDS.hotpot.hashtag);
  tags.push(loc[0]);
  if (typeSlug) tags.push(eventType(typeSlug).hashtag);
  tags.push(pick(loc.slice(1), seed));
  if (tags.length < 5) tags.push(COMMUNITY_TAG);
  return [...new Set(tags)].slice(0, 5).join(" ");
}

function brandNames(brands: BrandId[]) {
  return brands.map((b) => BRANDS[b].name).join(" × ");
}

function extras(e: EventRow) {
  const out: string[] = [];
  if (e.byob) out.push("🍾 BYOB");
  if (e.what_to_bring) out.push(`🎒 Bring: ${e.what_to_bring}`);
  if (e.limited_seats) out.push(e.capacity ? `⚠️ Only ${e.capacity} spots` : "⚠️ Limited spots");
  if (e.audience === "residents") out.push("🏡 For NomadGao residents");
  else out.push("👋 Open to all, no need to be staying with us");
  if (e.host) out.push(`🙋 Hosted by ${e.host}`);
  return out;
}

export function eventCaptions(e: EventRow, origin: string, seed = 0): Captions {
  const t = eventType(e.event_type);
  const loc = LOCATIONS[e.location];
  const s = hash(e.id, seed);
  const hello = pick(loc.greeting, s);
  const hook = pick(t.hooks, s >> 3);
  const when = `${dayName(e.event_date)}, ${dateShort(e.event_date)}${timeRange(e) ? ` · ${timeRange(e)}` : ""}`;
  const where = venueLine(e);
  const fee = feeText(e) + (e.fee_note && e.fee_type !== "custom" ? ` (${e.fee_note})` : "");
  const url = rsvpUrl(e, origin);
  const desc = e.description?.trim();
  const ex = extras(e);
  const brands = e.brands?.length ? e.brands : (["nomadgao"] as BrandId[]);
  const handles = brands.map((b) => BRANDS[b].handle).join(" ");

  let igRsvp = "Just walk in, everyone's welcome.";
  if (e.rsvp_mode === "form" || e.rsvp_mode === "link") igRsvp = e.limited_seats ? "Spots are limited. RSVP via the link in our bio or DM us." : "RSVP via the link in our bio or DM us.";
  if (e.rsvp_mode === "phone") igRsvp = `RSVP on WhatsApp: ${e.rsvp_phone}`;

  const instagram = [
    `${t.emoji} ${e.name}`,
    "",
    `${hello} ${hook}${desc ? ` ${desc}` : ""}`,
    "",
    `🗓 ${when}`,
    `📍 ${where}`,
    `🎟 ${fee}`,
    ...ex.slice(0, 3),
    "",
    igRsvp,
    "",
    `${handles}`,
    hashtags(e.location, brands, e.event_type, s),
  ].join("\n");

  let waRsvp = "No RSVP needed, just come by 🙌";
  if (url && e.rsvp_mode !== "phone") waRsvp = `👉 RSVP here: ${url}`;
  if (e.rsvp_mode === "phone") waRsvp = `👉 RSVP on WhatsApp: ${e.rsvp_phone}`;
  const whatsapp = [
    `${t.emoji} *${e.name}*`,
    desc ? `_${desc}_` : `_${hook}_`,
    "",
    `🗓 ${when}`,
    `📍 ${where}`,
    `🎟 ${fee}`,
    ...ex.filter((x) => !x.startsWith("👋")).slice(0, 3),
    "",
    waRsvp,
  ].join("\n");

  const community = [
    `Hi everyone 👋 ${brandNames(brands)} is hosting *${e.name}* this ${dayName(e.event_date)} in ${loc.name}.`,
    "",
    desc || hook,
    "",
    `When: ${when}`,
    `Where: ${where}`,
    `Entry: ${fee}`,
    e.audience === "residents" ? "This one is for NomadGao residents." : "Locals, travellers and nomads are all welcome. You don't need to be staying with us.",
    e.what_to_bring ? `Bring: ${e.what_to_bring}` : "",
    "",
    url ? `RSVP: ${url}` : "Just walk in. See you there!",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  return { instagram, whatsapp, community };
}

export function weekCaptions(events: EventRow[], week: string, location: LocationId | "both", origin: string, seed = 0): Captions {
  const sorted = [...events].sort((a, b) => (a.event_date + (a.start_time ?? "")).localeCompare(b.event_date + (b.start_time ?? "")));
  const line = (e: EventRow, bold: boolean) => {
    const t = eventType(e.event_type);
    const name = bold ? `*${e.name}*` : e.name;
    const time = e.start_time ? ` · ${timeRange(e).replace(" onwards", "")}` : "";
    const fee = e.fee_type === "free" ? " · Free" : e.fee_type === "paid" && e.fee_amount ? ` · ₹${e.fee_amount}` : "";
    return `${t.emoji} ${dayName(e.event_date, true)} ${dateShort(e.event_date)}: ${name}${time}${fee}`;
  };
  const range = weekRange(week);
  const s = hash(week, location, seed);
  const groups: [string, EventRow[]][] =
    location === "both"
      ? [
          ["🌴 GOA (Anjuna)", sorted.filter((e) => e.location === "goa")],
          ["🏔️ DHARAMKOT", sorted.filter((e) => e.location === "dharamkot")],
        ]
      : [["", sorted]];
  const body = (bold: boolean) =>
    groups
      .filter(([, evs]) => evs.length)
      .map(([h, evs]) => [h ? (bold ? `*${h}*` : h) : "", ...evs.map((e) => line(e, bold))].filter(Boolean).join("\n"))
      .join("\n\n");
  const withRsvp = sorted.filter((e) => e.rsvp_mode === "form" || e.rsvp_mode === "link");
  const rsvpLinks = withRsvp
    .map((e) => `${e.name}: ${rsvpUrl(e, origin)}`)
    .join("\n");
  const brands: BrandId[] = [...new Set(sorted.flatMap((e) => e.brands ?? ["nomadgao"]))] as BrandId[];
  const hello = location === "both" ? "Hello tribe! 👋" : pick(LOCATIONS[location].greeting, s);
  const title = location === "both" ? `This week at NomadGao (${range})` : `This week in ${LOCATIONS[location].name} (${range})`;
  const tagLoc: LocationId = location === "both" ? "goa" : location;
  const tags =
    location === "both"
      ? [BRANDS.nomadgao.hashtag, "#AnjunaGoa", "#Dharamkot", COMMUNITY_TAG, "#CoworkingIndia"].join(" ")
      : hashtags(tagLoc, brands.length ? brands : ["nomadgao"], null, s);

  const instagram = [`${hello} ${title} 🗓`, "", body(false), "", withRsvp.length ? "RSVP links in bio. Save this post so you don't miss a thing!" : "Save this post and come say hi!", "", tags].join("\n");
  const whatsapp = [`🗓 *${title}*`, "", body(true), "", withRsvp.length ? `*RSVP*\n${rsvpLinks}` : "No RSVP needed, just come by 🙌"].join("\n");
  const community = [
    `Hi everyone 👋 Here's what's happening at ${location === "both" ? "NomadGao in Goa and Dharamkot" : `${brandNames(brands.length ? brands : ["nomadgao"])} in ${LOCATIONS[location].name}`} this week. Everyone's welcome!`,
    "",
    body(false),
    "",
    withRsvp.length ? `RSVP:\n${rsvpLinks}` : "",
  ]
    .join("\n")
    .trim();
  return { instagram, whatsapp, community };
}
