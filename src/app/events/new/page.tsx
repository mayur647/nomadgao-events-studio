"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/app/Shell";
import { EventForm } from "@/components/app/EventForm";
import { sb } from "@/lib/supabase";
import type { EventRow } from "@/lib/types";

export default function NewEventPage() {
  const [copy, setCopy] = useState<EventRow | null | undefined>(undefined);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("copy");
    if (!id) return setCopy(null);
    sb().from("events").select("*").eq("id", id).maybeSingle().then(({ data }) => setCopy((data as EventRow) ?? null));
  }, []);
  return (
    <Shell>
      <h1 className="font-display text-3xl font-extrabold mb-1">{copy ? "Copy event" : "Add an event"}</h1>
      <p className="text-mute mb-6">{copy ? "Same details, one week later. Change anything you need." : "Fill this in before Monday. Posters and captions are made from it."}</p>
      {copy !== undefined && <EventForm copyFrom={copy ?? undefined} />}
    </Shell>
  );
}
