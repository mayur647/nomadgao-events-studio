/**
 * Turns loose event descriptions — from AI (photo, voice, pasted text) or from spreadsheet rows —
 * into draft events the team reviews before saving. Shared by the browser and the server.
 */
import { EVENT_TYPES, LOCATIONS, type BrandId, type LocationId } from "./constants";
import type { EventInput, FeeType, RsvpMode } from "./types";

/** What the AI (or a spreadsheet row) gives us: everything as plain text. */
export interface RawEvent {
  name?: string;
  event_type?: string;
  location?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  spot?: string;
  fee?: string;
  fee_note?: string;
  rsvp?: string;
  host?: string;
  description?: string;
  what_to_bring?: string;
  capacity?: string;
  byob?: string;
  audience?: string;
  brands?: string[] | string;
  unclear?: string;
}

export interface Issue {
  field: string;
  level: "error" | "check";
  msg: string;
}

export interface Draft extends EventInput {
  key: string;
  include: boolean;
  issues: Issue[];
  duplicateOf?: string;
}

export interface ImportContext {
  week: string; // Monday, yyyy-mm-dd
  location: LocationId; // default when the source doesn't say
  brands: BrandId[];
  today: string;
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function weekDates(week: string) {
  const mon = parseISO(week);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mon, i);
    return { iso: iso(d), day: DAYS[d.getDay()] };
  });
}

/* ───────────────────────── dates & times ───────────────────────── */
export function parseDateLoose(input: unknown, ctx: Pick<ImportContext, "week" | "today">): string | null {
  if (input instanceof Date && !isNaN(+input)) return iso(new Date(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  if (typeof input === "number" && input > 30000 && input < 80000) {
    // Excel serial date
    const d = new Date(Date.UTC(1899, 11, 30) + input * 86400000);
    return iso(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  const s = String(input ?? "").trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/,/g, " ");
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  const weekYear = parseISO(ctx.week).getFullYear();
  const guessYear = (mon: number, day: number) => {
    // pick the year that puts the date closest to the planning week
    const cands = [weekYear - 1, weekYear, weekYear + 1].map((y) => new Date(y, mon, day));
    const ref = +parseISO(ctx.week);
    return cands.sort((a, b) => Math.abs(+a - ref) - Math.abs(+b - ref))[0];
  };
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/); // Indian order: day/month/year
  if (m) {
    const day = +m[1], mon = +m[2] - 1;
    if (mon > 11 || day > 31) return null;
    if (m[3]) return iso(new Date(m[3].length === 2 ? 2000 + +m[3] : +m[3], mon, day));
    return iso(guessYear(mon, day));
  }
  const monIdx = (w: string) => MONTHS.findIndex((x) => w.startsWith(x));
  m = s.match(/(\d{1,2})\s+([a-z]{3,})(?:\s+(\d{4}))?/);
  if (m && monIdx(m[2]) >= 0) return m[3] ? iso(new Date(+m[3], monIdx(m[2]), +m[1])) : iso(guessYear(monIdx(m[2]), +m[1]));
  m = s.match(/([a-z]{3,})\s+(\d{1,2})(?:\s+(\d{4}))?/);
  if (m && monIdx(m[1]) >= 0) return m[3] ? iso(new Date(+m[3], monIdx(m[1]), +m[2])) : iso(guessYear(monIdx(m[1]), +m[2]));
  if (/\btoday\b/.test(s)) return ctx.today;
  if (/\btomorrow\b/.test(s)) return iso(addDays(parseISO(ctx.today), 1));
  const dayIdx = DAYS.findIndex((d) => s.includes(d.slice(0, 3)));
  if (dayIdx >= 0) return weekDates(ctx.week).find((d) => d.day === DAYS[dayIdx])!.iso;
  return null;
}

/** "7pm", "7:30 PM", "19:30", "1930", Excel fraction or Date → "HH:MM". */
export function parseTimeLoose(input: unknown): string | null {
  if (input instanceof Date && !isNaN(+input)) return `${pad(input.getUTCHours())}:${pad(input.getUTCMinutes())}`;
  if (typeof input === "number" && input >= 0 && input < 1) {
    const mins = Math.round(input * 24 * 60);
    return `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
  }
  const s = String(input ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  if (/noon/.test(s)) return "12:00";
  if (/midnight/.test(s)) return "00:00";
  const m = s.match(/^(\d{1,2})(?:[:.](\d{2}))?(am|pm|a\.m\.|p\.m\.)?$/) || s.match(/^(\d{2})(\d{2})$/);
  if (!m) return null;
  let h = +m[1];
  const min = m[2] ? +m[2] : 0;
  const ap = m[3]?.replace(/\./g, "");
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (!ap && h >= 1 && h <= 6) h += 12; // "3" or "5:30" with no am/pm at a community event means afternoon/evening
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

/** Splits "7 - 10 pm" / "7pm to 10pm" into start and end. */
export function splitTimeRange(s: string): [string | null, string | null] {
  const parts = s.split(/\s*(?:-|–|—|to|till|until)\s*/i).filter(Boolean);
  if (parts.length < 2) return [parseTimeLoose(s), null];
  const ap = parts[1].toLowerCase().match(/(am|pm)/)?.[1];
  const a = /am|pm/i.test(parts[0]) || !ap ? parts[0] : parts[0] + ap;
  return [parseTimeLoose(a), parseTimeLoose(parts[1])];
}

/* ───────────────────────── field guessing ───────────────────────── */
const TYPE_WORDS: [RegExp, string][] = [
  [/karaoke/, "karaoke"],
  [/hot ?pot/, "hotpot-social"],
  [/sip|paint/, "sip-paint"],
  [/board ?game|game ?night|games|chess|poker|uno|catan/, "game-night"],
  [/bonfire|bbq|barbecue|campfire/, "bonfire"],
  [/potluck/, "potluck"],
  [/hike|trek|trail|walk to/, "hike"],
  [/food walk|food tour/, "food-walk"],
  [/talk|nomadic connect|session|ama|panel/, "talk"],
  [/meet ?up|networking|mixer|welcome drinks/, "meetup"],
  [/movie|film|screening/, "movie"],
  [/cricket|football|match|watch party|f1|ipl/, "watch-party"],
  [/jam|open mic|live music|gig|concert/, "music"],
  [/yoga|meditation|breathwork|wellness|sound bath/, "wellness"],
  [/party|dj|dance/, "party"],
  [/workshop|class|making|lesson|masterclass/, "workshop"],
];

export function guessType(text: string): string {
  const s = text.toLowerCase().trim();
  if (!s) return "other";
  const exact = EVENT_TYPES.find((t) => t.slug === s || t.name.toLowerCase() === s);
  if (exact) return exact.slug;
  for (const [re, slug] of TYPE_WORDS) if (re.test(s)) return slug;
  return "other";
}

function guessLocation(...texts: (string | undefined)[]): LocationId | null {
  const s = texts.join(" ").toLowerCase();
  if (/dharamkot|himachal|mcleod|dharamsala|dharamshala|hot ?pot house|bhagsu/.test(s)) return "dharamkot";
  if (/goa|anjuna|villa nova|assagao|vagator/.test(s)) return "goa";
  return null;
}

function parseFee(fee: string): { fee_type: FeeType; fee_amount: number | null; fee_note: string | null } | null {
  const s = fee.trim();
  if (!s) return null;
  const l = s.toLowerCase();
  if (/^(free|no charge|0|₹ ?0|nil|complimentary)\b/.test(l) || l === "free entry") return { fee_type: "free", fee_amount: null, fee_note: null };
  if (/pay what|pwyw|donation|contribution|as you like/.test(l)) return { fee_type: "pwyw", fee_amount: null, fee_note: null };
  const m = l.replace(/,/g, "").match(/(?:₹|rs\.?|inr)?\s*(\d{2,6})/);
  if (m) {
    const rest = s.replace(/(?:₹|rs\.?|inr)?\s*[\d,]{2,7}(?:\s*\/-)?/i, "").replace(/^[\s,(·-]+|[\s)]+$/g, "");
    return { fee_type: "paid", fee_amount: +m[1], fee_note: rest || null };
  }
  return { fee_type: "custom", fee_amount: null, fee_note: s };
}

function parseRsvp(r: string): { rsvp_mode: RsvpMode; rsvp_link: string | null; rsvp_phone: string | null } | null {
  const s = r.trim();
  if (!s) return null;
  const l = s.toLowerCase();
  const url = s.match(/(https?:\/\/\S+|[a-z0-9-]+\.(?:com|in|co|io|me|gle|ly|link|app)\/\S*)/i)?.[0];
  if (url) return { rsvp_mode: "link", rsvp_link: url, rsvp_phone: null };
  const phone = s.match(/\+?\d[\d\s-]{8,}\d/)?.[0];
  if (phone) return { rsvp_mode: "phone", rsvp_link: null, rsvp_phone: phone.trim() };
  if (/^(no|none|not needed|walk ?in|n\/a|na)\b/.test(l)) return { rsvp_mode: "none", rsvp_link: null, rsvp_phone: null };
  if (/form|yes|required|rsvp|book|register|needed|limited/.test(l)) return { rsvp_mode: "form", rsvp_link: null, rsvp_phone: null };
  return null;
}

function yes(s?: string) {
  return /^(y|yes|true|1|✓|✔|byob)/i.test((s ?? "").trim());
}

let counter = 0;

/** Raw → draft, filling defaults and flagging anything to check. */
export function normalize(raw: RawEvent, ctx: ImportContext): Draft {
  const issues: Issue[] = [];
  const name = (raw.name ?? "").trim().replace(/\s+/g, " ");
  if (!name) issues.push({ field: "name", level: "error", msg: "Add a name" });

  const loc = guessLocation(raw.location, raw.venue) ?? null;
  const location: LocationId = loc ?? ctx.location;
  if (!loc) issues.push({ field: "location", level: "check", msg: `Location assumed: ${LOCATIONS[location].name}` });

  const date = parseDateLoose(raw.date, ctx);
  if (!date) issues.push({ field: "event_date", level: "error", msg: raw.date ? `Couldn't read the date "${raw.date}"` : "Add a date" });
  else {
    const days = weekDates(ctx.week).map((d) => d.iso);
    if (!days.includes(date)) issues.push({ field: "event_date", level: "check", msg: "Date is outside the chosen week" });
  }

  let start = parseTimeLoose(raw.start_time);
  let end = parseTimeLoose(raw.end_time);
  if (!start && raw.start_time && /-|–|to/.test(raw.start_time)) [start, end] = splitTimeRange(raw.start_time);
  if (!start) issues.push({ field: "start_time", level: "check", msg: raw.start_time ? `Couldn't read the time "${raw.start_time}"` : "No start time" });
  else if (raw.start_time && !/am|pm|:\d\d\s*$|^\s*\d{2}:\d{2}\s*$/i.test(raw.start_time) && +start.slice(0, 2) >= 7 && +start.slice(0, 2) <= 11)
    issues.push({ field: "start_time", level: "check", msg: "Morning or evening? Check the time" });

  const venueRaw = (raw.venue ?? "").trim();
  const venue = venueRaw || LOCATIONS[location].venues[0];
  if (!venueRaw) issues.push({ field: "venue", level: "check", msg: "Venue assumed" });

  const fee = parseFee(raw.fee ?? "");
  if (!fee) issues.push({ field: "fee_type", level: "check", msg: "Entry fee not mentioned, set to Free" });

  const rsvp = parseRsvp(raw.rsvp ?? "");
  const cap = parseInt(String(raw.capacity ?? "").replace(/[^\d]/g, ""), 10);

  const brandText = (Array.isArray(raw.brands) ? raw.brands.join(" ") : raw.brands ?? "").toLowerCase();
  let brands: BrandId[] = [];
  if (/nomad/.test(brandText)) brands.push("nomadgao");
  if (/hot ?pot|thh/.test(brandText)) brands.push("hotpot");
  if (!brands.length) brands = [...ctx.brands];
  if (/hot ?pot/i.test(venue) && !brands.includes("hotpot")) brands = ["hotpot", ...brands];

  const typeSlug = guessType(raw.event_type || "") !== "other" ? guessType(raw.event_type || "") : guessType(name);
  if (raw.unclear?.trim()) issues.push({ field: "name", level: "check", msg: raw.unclear.trim() });

  return {
    key: `d${Date.now().toString(36)}${counter++}`,
    include: !issues.some((i) => i.level === "error"),
    issues,
    location,
    brands,
    name,
    event_type: typeSlug,
    event_date: date ?? "",
    start_time: start,
    end_time: end,
    venue,
    spot: raw.spot?.trim() || null,
    fee_type: fee?.fee_type ?? "free",
    fee_amount: fee?.fee_amount ?? null,
    fee_note: (raw.fee_note?.trim() || fee?.fee_note) ?? null,
    rsvp_mode: rsvp?.rsvp_mode ?? (Number.isFinite(cap) && cap > 0 ? "form" : "none"),
    rsvp_link: rsvp?.rsvp_link ?? null,
    rsvp_phone: rsvp?.rsvp_phone ?? null,
    show_qr: true,
    host: raw.host?.trim() || null,
    description: raw.description?.trim().slice(0, 160) || null,
    what_to_bring: raw.what_to_bring?.trim() || null,
    limited_seats: Number.isFinite(cap) && cap > 0,
    capacity: Number.isFinite(cap) && cap > 0 ? cap : null,
    byob: yes(raw.byob),
    audience: /resident/i.test(raw.audience ?? "") ? "residents" : "open",
    photo_path: null,
  };
}

/** Re-check a draft after the user edits it in the review table. */
export function recheck(d: Draft, ctx: ImportContext): Issue[] {
  const issues: Issue[] = [];
  if (!d.name.trim()) issues.push({ field: "name", level: "error", msg: "Add a name" });
  if (!d.event_date) issues.push({ field: "event_date", level: "error", msg: "Add a date" });
  else if (!weekDates(ctx.week).some((x) => x.iso === d.event_date)) issues.push({ field: "event_date", level: "check", msg: "Date is outside the chosen week" });
  if (!d.start_time) issues.push({ field: "start_time", level: "check", msg: "No start time" });
  if (d.fee_type === "paid" && !d.fee_amount) issues.push({ field: "fee_type", level: "error", msg: "Add the fee amount" });
  if (d.rsvp_mode === "link" && !d.rsvp_link) issues.push({ field: "rsvp_mode", level: "error", msg: "Add the RSVP link" });
  if (d.rsvp_mode === "phone" && !d.rsvp_phone) issues.push({ field: "rsvp_mode", level: "error", msg: "Add the WhatsApp number" });
  return issues;
}

/* ───────────────────────── spreadsheets ───────────────────────── */
const HEADERS: Record<string, keyof RawEvent> = {
  name: "name", event: "name", eventname: "name", title: "name", what: "name",
  type: "event_type", category: "event_type", eventtype: "event_type", kind: "event_type",
  location: "location", city: "location", property: "location",
  brand: "brands", brands: "brands", branding: "brands",
  date: "date", day: "date", eventdate: "date", when: "date",
  start: "start_time", starttime: "start_time", time: "start_time", from: "start_time", starts: "start_time",
  end: "end_time", endtime: "end_time", to: "end_time", until: "end_time", ends: "end_time",
  venue: "venue", place: "venue", where: "venue", address: "venue",
  spot: "spot", area: "spot", room: "spot",
  fee: "fee", price: "fee", entry: "fee", entryfee: "fee", cost: "fee", ticket: "fee", tickets: "fee",
  feenote: "fee_note", feenotes: "fee_note", includes: "fee_note", priceincludes: "fee_note",
  rsvp: "rsvp", rsvplink: "rsvp", booking: "rsvp", register: "rsvp", registration: "rsvp", signup: "rsvp",
  host: "host", hostedby: "host", facilitator: "host", by: "host",
  description: "description", about: "description", details: "description", desc: "description", notes: "description",
  bring: "what_to_bring", whattobring: "what_to_bring",
  seats: "capacity", capacity: "capacity", limit: "capacity", maxpeople: "capacity", limitedseats: "capacity",
  byob: "byob",
  audience: "audience", for: "audience", opento: "audience", residentsonly: "audience",
};

const keyOf = (h: unknown) => String(h ?? "").toLowerCase().replace(/[^a-z]/g, "");

/** Find the header row and map columns; returns null when the sheet doesn't look like our template. */
export function mapSheet(rows: unknown[][]): RawEvent[] | null {
  const headerIdx = rows.slice(0, 8).findIndex((r) => r.filter((c) => HEADERS[keyOf(c)]).length >= 2);
  if (headerIdx < 0) return null;
  const header = rows[headerIdx].map((c) => HEADERS[keyOf(c)] ?? null);
  if (!header.includes("name") && !header.includes("date")) return null;
  const out: RawEvent[] = [];
  for (const row of rows.slice(headerIdx + 1)) {
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
    const raw: RawEvent = {};
    row.forEach((cell, i) => {
      const k = header[i];
      if (!k || cell === null || cell === undefined || cell === "") return;
      // keep Dates/numbers for date & time parsing, text for the rest
      const v = cell instanceof Date ? cell.toISOString() : String(cell);
      if (k === "date" && (cell instanceof Date || typeof cell === "number")) {
        (raw as Record<string, unknown>).date = cell instanceof Date ? cell.toISOString().slice(0, 10) : cell;
        return;
      }
      if ((k === "start_time" || k === "end_time") && (cell instanceof Date || typeof cell === "number")) {
        (raw as Record<string, unknown>)[k] = parseTimeLoose(cell) ?? v;
        return;
      }
      if (k === "audience" && keyOf(rows[headerIdx][i]) === "residentsonly") {
        raw.audience = yes(String(cell)) ? "residents" : "open";
        return;
      }
      if (k === "brands") raw.brands = String(cell);
      else (raw as Record<string, unknown>)[k] = raw[k] ? `${raw[k]} ${v}` : v;
    });
    out.push(raw);
  }
  return out;
}

export const TEMPLATE_HEADERS = [
  "Event name", "Type", "Location", "Brands", "Date", "Start time", "End time", "Venue", "Spot", "Entry fee", "Fee note", "RSVP", "Host", "Description", "What to bring", "Seats", "BYOB", "Audience",
];

/* ───────────────────────── AI request shape ───────────────────────── */
export const AI_EVENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    events: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          event_type: { type: "STRING" },
          location: { type: "STRING" },
          date: { type: "STRING" },
          start_time: { type: "STRING" },
          end_time: { type: "STRING" },
          venue: { type: "STRING" },
          spot: { type: "STRING" },
          fee: { type: "STRING" },
          fee_note: { type: "STRING" },
          rsvp: { type: "STRING" },
          host: { type: "STRING" },
          description: { type: "STRING" },
          what_to_bring: { type: "STRING" },
          capacity: { type: "STRING" },
          byob: { type: "STRING" },
          audience: { type: "STRING" },
          brands: { type: "ARRAY", items: { type: "STRING" } },
          unclear: { type: "STRING" },
        },
        required: ["name", "date"],
      },
    },
  },
  required: ["events"],
};

export function aiInstructions(ctx: ImportContext) {
  const days = weekDates(ctx.week)
    .map((d) => `${d.day[0].toUpperCase() + d.day.slice(1)} = ${d.iso}`)
    .join(", ");
  return `You read event plans written by the community team of NomadGao (coworking + coliving) and The Hotpot House (an Asian cafe in Dharamkot).
The input may be a photo of handwritten notes, a voice note, a WhatsApp message, or a messy spreadsheet. Extract every event.

Context:
- Today is ${ctx.today}. The planning week is Monday ${ctx.week} to Sunday: ${days}.
- Weekday names ("Thursday", "Sat") mean that day in the planning week.
- Locations: "goa" (NomadGao Villa Nova, Anjuna) and "dharamkot" (NomadGao Dharamkot and The Hotpot House, Himachal). If the input doesn't say, leave location empty.
- Event types to choose from: ${EVENT_TYPES.map((t) => t.slug).join(", ")}.
- Brands: "nomadgao", "hotpot".

Rules:
- One object per event. Never invent details. Leave a field as an empty string when it isn't stated.
- date: YYYY-MM-DD. start_time / end_time: 24-hour HH:MM. "7" or "7:30" with no am/pm at an evening social means pm.
- fee: copy what was said ("free", "₹600", "pay what you feel", "300 incl. a drink").
- rsvp: a link, a phone number, "form" if they said RSVP is needed with no link, or "none" for walk-in.
- capacity: a number only when seats are limited.
- byob: "yes" only if said.
- name: short and poster-friendly, in Title Case, without the date or time.
- description: one short line about what happens, only if the input gives it.
- unclear: anything you had to guess or couldn't read for this event, in a few words. Empty if all clear.`;
}
