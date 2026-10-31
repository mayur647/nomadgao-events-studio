import type { EventRow } from "./types";
import { LOCATIONS } from "./constants";

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}
export function toISO(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
/** Monday of the week containing d */
export function weekStart(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  return addDays(x, -dow);
}
export function todayIST() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
export function dayName(d: string, short = false) {
  const n = DAY[parseDate(d).getDay()];
  return short ? n.slice(0, 3) : n;
}
export function dateShort(d: string) {
  const x = parseDate(d);
  return `${x.getDate()} ${MON[x.getMonth()]}`;
}
export function dayNum(d: string) {
  return String(parseDate(d).getDate());
}
export function monthShort(d: string) {
  return MON[parseDate(d).getMonth()];
}
export function weekRange(start: string) {
  const s = parseDate(start);
  const e = addDays(s, 6);
  if (s.getMonth() === e.getMonth()) return `${s.getDate()}–${e.getDate()} ${MON[e.getMonth()]}`;
  return `${s.getDate()} ${MON[s.getMonth()]} – ${e.getDate()} ${MON[e.getMonth()]}`;
}
export function time12(t: string | null | undefined) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, "0")} ${ap}` : `${hh} ${ap}`;
}
export function timeRange(e: Pick<EventRow, "start_time" | "end_time">) {
  const s = time12(e.start_time);
  const en = time12(e.end_time);
  if (s && en) {
    // "7 – 10 PM" when both share AM/PM
    if (s.slice(-2) === en.slice(-2)) return `${s.slice(0, -3)} – ${en}`;
    return `${s} – ${en}`;
  }
  return s ? `${s} onwards` : "";
}
export function feeText(e: Pick<EventRow, "fee_type" | "fee_amount" | "fee_note">) {
  switch (e.fee_type) {
    case "free":
      return "Free entry";
    case "paid":
      return e.fee_amount ? `₹${e.fee_amount.toLocaleString("en-IN")}` : "Paid entry";
    case "pwyw":
      return "Pay what you feel";
    case "custom":
      return e.fee_note || "Entry details inside";
  }
}
export function feeShort(e: Pick<EventRow, "fee_type" | "fee_amount" | "fee_note">) {
  if (e.fee_type === "free") return "Free";
  if (e.fee_type === "paid" && e.fee_amount) return `₹${e.fee_amount.toLocaleString("en-IN")}`;
  if (e.fee_type === "pwyw") return "PWYW";
  return feeText(e);
}
export function venueLine(e: Pick<EventRow, "venue" | "spot" | "location">) {
  const v = e.venue || LOCATIONS[e.location].venues[0];
  return e.spot ? `${v} · ${e.spot}` : v;
}
export function rsvpUrl(e: Pick<EventRow, "id" | "rsvp_mode" | "rsvp_link" | "rsvp_phone">, origin: string) {
  if (e.rsvp_mode === "form") return `${origin}/rsvp/${e.id}`;
  if (e.rsvp_mode === "link" && e.rsvp_link) return e.rsvp_link.startsWith("http") ? e.rsvp_link : `https://${e.rsvp_link}`;
  if (e.rsvp_mode === "phone" && e.rsvp_phone) return `https://wa.me/${e.rsvp_phone.replace(/[^0-9]/g, "")}`;
  return null;
}
export function rsvpLine(e: Pick<EventRow, "rsvp_mode" | "rsvp_phone" | "limited_seats">) {
  if (e.rsvp_mode === "none") return "Walk in. Open to all.";
  if (e.rsvp_mode === "phone") return `RSVP on WhatsApp ${e.rsvp_phone ?? ""}`.trim();
  return e.limited_seats ? "Limited seats · scan to RSVP" : "Scan to RSVP";
}

/** The week the team is planning: this week on Mon–Wed, next week from Thursday on. */
export function planningWeek() {
  const t = todayIST();
  const ws = weekStart(t);
  const dow = (t.getDay() + 6) % 7; // 0 = Monday
  return toISO(dow >= 3 ? addDays(ws, 7) : ws);
}
