"use client";
import { use, useEffect, useState } from "react";
import { Shell } from "@/components/app/Shell";
import { EventForm } from "@/components/app/EventForm";
import { sb } from "@/lib/supabase";
import type { EventRow } from "@/lib/types";

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ev, setEv] = useState<EventRow | null | undefined>(undefined);
  useEffect(() => {
    sb().from("events").select("*").eq("id", id).maybeSingle().then(({ data }) => setEv((data as EventRow) ?? null));
  }, [id]);
  return (
    <Shell>
      <h1 className="font-display text-3xl font-extrabold mb-6">Edit event</h1>
      {ev === undefined ? <p className="text-mute">Loading…</p> : ev === null ? <p>This event doesn&apos;t exist any more.</p> : <EventForm existing={ev} />}
    </Shell>
  );
}
