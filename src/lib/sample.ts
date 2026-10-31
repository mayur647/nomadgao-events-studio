import type { EventRow } from "./types";
import { addDays, toISO } from "./format";

/** Example week used by the /samples page so the team can see every layout without logging in. */
export function sampleEvents(week: string): EventRow[] {
  const [y, m, d] = week.split("-").map(Number);
  const day = (n: number) => toISO(addDays(new Date(y, m - 1, d), n));
  const base = {
    created_by: null, created_at: "", updated_at: "", photo_path: null, spot: null, fee_note: null, fee_amount: null,
    rsvp_link: null, rsvp_phone: null, show_qr: true, host: null, description: null, what_to_bring: null,
    limited_seats: false, capacity: null, byob: false, audience: "open" as const, end_time: null,
  };
  return [
    { ...base, id: "s1", location: "goa", brands: ["nomadgao"], name: "Thursday Game Night", event_type: "game-night", event_date: day(3), start_time: "19:30:00", end_time: "23:00:00", venue: "NomadGao Villa Nova, Anjuna", spot: "Garden", fee_type: "free", rsvp_mode: "none", description: "Catan, Codenames and a very competitive Uno table.", byob: true },
    { ...base, id: "s2", location: "goa", brands: ["nomadgao"], name: "Sunset Sip & Paint", event_type: "sip-paint", event_date: day(5), start_time: "17:00:00", end_time: "19:30:00", venue: "NomadGao Villa Nova, Anjuna", fee_type: "paid", fee_amount: 800, fee_note: "includes a drink", rsvp_mode: "form", limited_seats: true, capacity: 16, host: "Ana from Lisbon", description: "Brushes, canvas and a sundowner. No art skills needed.", photo_path: "/samples/bokeh.jpg" },
    { ...base, id: "s3", location: "goa", brands: ["nomadgao"], name: "Sunday Beach Hike", event_type: "hike", event_date: day(6), start_time: "07:00:00", end_time: "10:00:00", venue: "Meet at NomadGao Villa Nova", fee_type: "free", rsvp_mode: "phone", rsvp_phone: "+91 74999 53309", what_to_bring: "Water, shoes you can get sandy" },
    { ...base, id: "s4", location: "dharamkot", brands: ["hotpot", "nomadgao"], name: "Hotpot Social", event_type: "hotpot-social", event_date: day(4), start_time: "19:00:00", end_time: "22:00:00", venue: "The Hotpot House, Dharamkot", spot: "Rooftop", fee_type: "paid", fee_amount: 650, rsvp_mode: "form", limited_seats: true, capacity: 20, description: "One big table, one bubbling pot, a dozen new friends." },
    { ...base, id: "s5", location: "dharamkot", brands: ["nomadgao"], name: "Karaoke Night", event_type: "karaoke", event_date: day(5), start_time: "20:00:00", venue: "NomadGao Dharamkot", fee_type: "free", rsvp_mode: "none", description: "Be your silliest. Popcorn's on the house.", byob: true },
    { ...base, id: "s6", location: "dharamkot", brands: ["nomadgao"], name: "Gallu Temple Trek", event_type: "hike", event_date: day(6), start_time: "08:00:00", end_time: "13:00:00", venue: "NomadGao Dharamkot", spot: "Front gate", fee_type: "pwyw", rsvp_mode: "link", rsvp_link: "forms.gle/example", what_to_bring: "Water, a snack, layers" },
    { ...base, id: "s7", location: "dharamkot", brands: ["hotpot"], name: "Momo Making Workshop", event_type: "workshop", event_date: day(3), start_time: "16:00:00", end_time: "18:00:00", venue: "The Hotpot House, Dharamkot", fee_type: "paid", fee_amount: 500, rsvp_mode: "form", host: "Chef Tenzin", description: "Fold, pinch and steam your way to perfect momos." },
  ] as EventRow[];
}
