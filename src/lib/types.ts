import type { BrandId, LocationId } from "./constants";

export type Role = "pending" | "manager" | "admin" | "disabled";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  location: LocationId | null;
  created_at: string;
}

export type FeeType = "free" | "paid" | "pwyw" | "custom";
export type RsvpMode = "none" | "form" | "link" | "phone";

export interface EventRow {
  id: string;
  location: LocationId;
  brands: BrandId[];
  name: string;
  event_type: string;
  event_date: string; // yyyy-mm-dd
  start_time: string | null; // HH:MM:SS
  end_time: string | null;
  venue: string | null;
  spot: string | null;
  fee_type: FeeType;
  fee_amount: number | null;
  fee_note: string | null;
  rsvp_mode: RsvpMode;
  rsvp_link: string | null;
  rsvp_phone: string | null;
  show_qr: boolean;
  host: string | null;
  description: string | null;
  what_to_bring: string | null;
  limited_seats: boolean;
  capacity: number | null;
  byob: boolean;
  audience: "open" | "residents";
  photo_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EventInput = Omit<EventRow, "id" | "created_by" | "created_at" | "updated_at">;

export interface PhotoRow {
  id: string;
  location: LocationId | "any";
  event_type: string;
  path: string;
  created_by: string | null;
  created_at: string;
}

export interface RsvpRow {
  id: string;
  event_id: string;
  name: string;
  phone: string;
  email: string | null;
  guests: number;
  staying_with_us: boolean;
  note: string | null;
  status: "confirmed" | "waitlist" | "cancelled";
  created_at: string;
}

export interface GenerationRow {
  id: string;
  user_id: string | null;
  kind: string;
  action: string;
  location: string | null;
  size: string | null;
  template: string | null;
  event_id: string | null;
  week_start: string | null;
  count: number;
  created_at: string;
}
