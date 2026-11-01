"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Shell } from "@/components/app/Shell";
import { WeekPicker } from "@/components/app/WeekPicker";
import { useAuth } from "@/components/app/Auth";
import { useToast } from "@/components/app/Toast";
import { ImportReview } from "@/components/app/ImportReview";
import { sb } from "@/lib/supabase";
import { BRANDS, type BrandId, type LocationId } from "@/lib/constants";
import { addDays, parseDate, planningWeek, toISO, todayIST } from "@/lib/format";
import { compressImage } from "@/lib/export";
import { blobToBase64, toWav16k } from "@/lib/audio";
import { mapSheet, normalize, type Draft, type ImportContext, type RawEvent } from "@/lib/importer";
import type { EventRow } from "@/lib/types";

type Tab = "text" | "photo" | "voice" | "file" | "sheet";
const TABS: [Tab, string, string][] = [
  ["text", "✍️", "Type or paste"],
  ["photo", "📷", "Photo of notes"],
  ["voice", "🎙️", "Voice"],
  ["file", "📊", "Excel / CSV"],
  ["sheet", "🟩", "Google Sheet"],
];

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRec = any;
const getSpeech = (): (new () => SpeechRec) | null => (typeof window === "undefined" ? null : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null);

export default function ImportPage() {
  const { session, profile } = useAuth();
  const toast = useToast();
  const [week, setWeek] = useState(planningWeek());
  const [location, setLocation] = useState<LocationId>("goa");
  const [brands, setBrands] = useState<BrandId[]>(["nomadgao"]);
  const [tab, setTab] = useState<Tab>("text");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedWeek, setSavedWeek] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.location) setLocation(profile.location);
  }, [profile?.location]);

  const ctx: ImportContext = useMemo(() => ({ week, location, brands, today: toISO(todayIST()) }), [week, location, brands]);

  /** Add drafts and mark any that already exist in the calendar. */
  async function addRaw(raw: RawEvent[], source: string) {
    const ds = raw.map((r) => normalize(r, ctx)).filter((d) => d.name || d.event_date);
    if (!ds.length) {
      toast(`No events found in the ${source}. Try adding more detail.`, "err");
      return;
    }
    const dates = ds.map((d) => d.event_date).filter(Boolean).sort();
    if (dates.length) {
      const { data } = await sb().from("events").select("id, name, event_date, location").gte("event_date", dates[0]).lte("event_date", dates[dates.length - 1]);
      for (const d of ds) {
        const dup = (data as Pick<EventRow, "id" | "name" | "event_date" | "location">[] | null)?.find((e) => e.event_date === d.event_date && e.location === d.location && e.name.trim().toLowerCase() === d.name.trim().toLowerCase());
        if (dup) {
          d.duplicateOf = dup.id;
          d.include = false;
        }
      }
    }
    setDrafts((x) => [...x, ...ds]);
    toast(`Found ${ds.length} event${ds.length === 1 ? "" : "s"}. Check them below.`);
    setTimeout(() => document.getElementById("review")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function ai(kind: "text" | "image" | "audio", payload: { text?: string; mime?: string; data?: string }, source: string) {
    setBusy(source);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ kind, ...payload, ctx }),
      });
      const data = await res.json().catch(() => ({ error: "The upload was too big." }));
      if (!res.ok) throw new Error(data.error || "Couldn't read that");
      await addRaw(data.events as RawEvent[], source);
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(null);
    }
  }

  /** Spreadsheet rows: use our column mapping when it matches, otherwise let AI make sense of it. */
  async function fromRows(rows: unknown[][], source: string) {
    const mapped = mapSheet(rows);
    if (mapped) return addRaw(mapped, source);
    const csv = Papa.unparse(rows.map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c ?? ""))));
    return ai("text", { text: `Spreadsheet (CSV):\n${csv}` }, source);
  }

  async function save() {
    const rows = drafts.filter((d) => d.include);
    setSaving(true);
    const payload = rows.map((d) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { key, include, issues, duplicateOf, ...ev } = d;
      return {
        ...ev,
        fee_amount: ev.fee_type === "paid" ? ev.fee_amount : null,
        capacity: ev.limited_seats ? ev.capacity : null,
        show_qr: ev.rsvp_mode !== "none",
        created_by: session?.user.id,
      };
    });
    const { error } = await sb().from("events").insert(payload);
    setSaving(false);
    if (error) return toast(error.message, "err");
    const keys = new Set(rows.map((r) => r.key));
    setDrafts((x) => x.filter((d) => !keys.has(d.key)));
    setSavedWeek(week);
    toast(`Added ${rows.length} event${rows.length === 1 ? "" : "s"}`);
  }

  return (
    <Shell wide>
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="mr-auto">
          <h1 className="font-display text-3xl font-extrabold">Import events</h1>
          <p className="text-mute text-sm">Add the whole week at once, from notes, a voice note, a photo, Excel or Google Sheets. You check everything before it&apos;s saved.</p>
        </div>
        <Link href="/events/new" className="btn-ghost">
          Add one by hand
        </Link>
      </div>

      <div className="card p-4 mb-5 flex flex-wrap items-center gap-4">
        <div>
          <span className="label">Week</span>
          <WeekPicker week={week} onChange={setWeek} />
        </div>
        <div>
          <span className="label">If the notes don&apos;t say, assume</span>
          <div className="flex flex-wrap gap-2">
            {(["goa", "dharamkot"] as LocationId[]).map((l) => (
              <button key={l} className={`chip ${location === l ? "chip-on" : ""}`} onClick={() => setLocation(l)}>
                {l === "goa" ? "🌴 Goa" : "🏔️ Dharamkot"}
              </button>
            ))}
            <span className="w-px bg-line mx-1" />
            {(Object.keys(BRANDS) as BrandId[]).map((b) => (
              <button
                key={b}
                className={`chip ${brands.includes(b) ? "chip-on" : ""}`}
                onClick={() => setBrands((x) => (x.includes(b) ? (x.length > 1 ? x.filter((y) => y !== b) : x) : [...x, b]))}
              >
                {BRANDS[b].name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="How do you want to add events?">
        {TABS.map(([v, icon, label]) => (
          <button key={v} role="tab" aria-selected={tab === v} className={`chip !py-2 !px-4 ${tab === v ? "chip-on" : ""}`} onClick={() => setTab(v)}>
            <span aria-hidden>{icon}</span> {label}
          </button>
        ))}
      </div>

      <div className="card p-5 mb-8">
        {tab === "text" && <TextInput busy={busy === "text"} onSubmit={(t) => ai("text", { text: t }, "text")} week={week} />}
        {tab === "photo" && <PhotoInput busy={busy === "photo"} onSubmit={(mime, data) => ai("image", { mime, data }, "photo")} />}
        {tab === "voice" && <VoiceInput busy={busy === "voice"} onText={(t) => ai("text", { text: `Transcript of a voice note:\n${t}` }, "voice")} onAudio={(data) => ai("audio", { mime: "audio/wav", data }, "voice")} />}
        {tab === "file" && <FileInput busy={busy === "file"} setBusy={(b) => setBusy(b ? "file" : null)} onRows={(r) => fromRows(r, "file")} />}
        {tab === "sheet" && <SheetInput busy={busy === "sheet"} token={session?.access_token} setBusy={(b) => setBusy(b ? "sheet" : null)} onRows={(r) => fromRows(r, "sheet")} />}
      </div>

      {savedWeek && drafts.length === 0 && (
        <div className="card p-6 mb-8 flex flex-wrap items-center gap-3">
          <p className="font-hand text-3xl text-moss mr-auto">all added!</p>
          <Link href={`/events?week=${savedWeek}`} className="btn-ghost">See the events</Link>
          <Link href={`/?week=${savedWeek}`} className="btn-primary">Make this week&apos;s posters</Link>
        </div>
      )}

      <div id="review">{drafts.length > 0 && <ImportReview drafts={drafts} ctx={ctx} onChange={setDrafts} onSave={save} saving={saving} />}</div>
    </Shell>
  );
}

/* ───────────────────────── inputs ───────────────────────── */
function TextInput({ busy, onSubmit, week }: { busy: boolean; onSubmit: (t: string) => void; week: string }) {
  const [t, setT] = useState("");
  const example = `Thu – game night 7:30 garden, free, byob
Fri – hotpot social at Hotpot House rooftop 7–10pm, ₹650 incl. drink, 20 seats, RSVP needed
Sat ${parseDate(toISO(addDays(parseDate(week), 5))).getDate()} – karaoke 8pm, free
Sun – Gallu temple trek 8am from the front gate, pay what you feel, bring water`;
  return (
    <div className="space-y-3">
      <label className="label" htmlFor="paste">Type the plan, or paste a WhatsApp message</label>
      <textarea id="paste" className="input font-normal min-h-[180px]" placeholder={example} value={t} onChange={(e) => setT(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={busy || t.trim().length < 4} onClick={() => onSubmit(t)}>
          {busy ? "Reading…" : "Find events"}
        </button>
        <button className="btn-ghost btn-sm" onClick={() => setT(example)}>
          Try an example
        </button>
        <span className="hint !mt-0">Any format works. Weekdays mean the week you picked above.</span>
      </div>
    </div>
  );
}

function PhotoInput({ busy, onSubmit }: { busy: boolean; onSubmit: (mime: string, data: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const toast = useToast();
  async function pick(f: File) {
    try {
      const b = await compressImage(f, 2000, 0.85);
      setBlob(b);
      setPreview(URL.createObjectURL(b));
    } catch {
      toast("Couldn't open that photo. Use a JPG or PNG.", "err");
    }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">Take a clear photo of the whiteboard or notebook page in good light, then upload it here.</p>
      <div className="flex flex-wrap items-start gap-4">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your notes" className="max-h-64 rounded-xl border border-line" />
        )}
        <div className="flex flex-col gap-3">
          <label className="btn-ghost">
            {preview ? "Choose another photo" : "Choose or take a photo"}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          </label>
          <button className="btn-primary" disabled={!blob || busy} onClick={async () => blob && onSubmit("image/jpeg", await blobToBase64(blob))}>
            {busy ? "Reading your notes…" : "Read the photo"}
          </button>
        </div>
      </div>
      <p className="hint">Messy handwriting works, but you&apos;ll have more to fix in the check step.</p>
    </div>
  );
}

function VoiceInput({ busy, onText, onAudio }: { busy: boolean; onText: (t: string) => void; onAudio: (base64: string) => void }) {
  const Speech = getSpeech();
  const toast = useToast();
  const [rec, setRec] = useState(false);
  const [text, setText] = useState("");
  const [secs, setSecs] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const recog = useRef<SpeechRec | null>(null);
  const media = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const base = useRef("");

  useEffect(
    () => () => {
      recog.current?.stop?.();
      media.current?.stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
    },
    []
  );

  function tick() {
    setSecs(0);
    timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
  }

  async function start() {
    if (Speech) {
      const r = new Speech();
      r.lang = "en-IN";
      r.continuous = true;
      r.interimResults = true;
      base.current = text ? text.trim() + "\n" : "";
      r.onresult = (e: any) => {
        let finals = "", interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finals += t.trim() + ". ";
          else interim += t;
        }
        setText(base.current + finals + interim);
      };
      r.onerror = (e: any) => {
        if (e.error === "not-allowed") toast("Allow the microphone in your browser to use voice.", "err");
        stop();
      };
      r.onend = () => setRec(false);
      recog.current = r;
      r.start();
      setRec(true);
      tick();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const m = new MediaRecorder(stream);
      m.ondataavailable = (e) => chunks.push(e.data);
      m.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        try {
          setAudio(await toWav16k(new Blob(chunks, { type: m.mimeType })));
        } catch {
          toast("Couldn't process the recording. Try again.", "err");
        }
      };
      media.current = m;
      m.start();
      setRec(true);
      tick();
    } catch {
      toast("Allow the microphone in your browser to use voice.", "err");
    }
  }

  function stop() {
    recog.current?.stop?.();
    if (media.current?.state === "recording") media.current.stop();
    if (timer.current) clearInterval(timer.current);
    setRec(false);
  }

  useEffect(() => {
    if (rec && secs >= 150) stop();
  }, [rec, secs]);

  return (
    <div className="space-y-3">
      <p className="text-sm">Say each event in one go: name, day, time, place, price and RSVP. For example: &quot;Friday, hotpot social on the Hotpot House rooftop, seven to ten, six fifty including a drink, twenty seats.&quot;</p>
      <div className="flex flex-wrap items-center gap-3">
        {!rec ? (
          <button className="btn-chili" onClick={start} disabled={busy}>
            ● {text || audio ? "Record more" : "Start recording"}
          </button>
        ) : (
          <button className="btn-primary" onClick={stop}>
            ■ Stop ({Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")})
          </button>
        )}
        {Speech ? (
          <button className="btn-primary" disabled={busy || rec || text.trim().length < 4} onClick={() => onText(text)}>
            {busy ? "Reading…" : "Find events"}
          </button>
        ) : (
          <button className="btn-primary" disabled={busy || rec || !audio} onClick={async () => audio && onAudio(await blobToBase64(audio))}>
            {busy ? "Listening…" : "Find events"}
          </button>
        )}
        <span className="hint !mt-0">Up to 2½ minutes.</span>
      </div>
      {Speech && (
        <>
          <label className="label" htmlFor="tr">What we heard (fix anything before you continue)</label>
          <textarea id="tr" className="input font-normal min-h-[140px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your words appear here as you speak." />
        </>
      )}
      {!Speech && audio && <audio controls src={URL.createObjectURL(audio)} className="w-full max-w-md" />}
    </div>
  );
}

function TemplateLinks() {
  return (
    <p className="text-sm">
      Use our template so everything is read exactly:{" "}
      <a className="underline font-semibold" href="/templates/nomadgao-events-template.xlsx" download>
        Excel template
      </a>{" "}
      ·{" "}
      <a className="underline font-semibold" href="/templates/nomadgao-events-template.csv" download>
        CSV template
      </a>
      . Other layouts work too; the AI sorts them out.
    </p>
  );
}

function FileInput({ busy, setBusy, onRows }: { busy: boolean; setBusy: (b: boolean) => void; onRows: (rows: unknown[][]) => Promise<void> }) {
  const toast = useToast();
  async function pick(f: File) {
    setBusy(true);
    try {
      let rows: unknown[][];
      if (/\.csv$|text\/csv/i.test(f.name + f.type)) {
        const text = await f.text();
        rows = Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
      } else if (/\.xlsx$/i.test(f.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        rows = (await readSheet(f)) as unknown[][];
      } else {
        throw new Error("Use an .xlsx or .csv file. In Excel, older .xls files can be saved as .xlsx.");
      }
      await onRows(rows);
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <TemplateLinks />
      <label className="btn-primary">
        {busy ? "Reading…" : "Upload Excel or CSV"}
        <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      </label>
      <p className="hint">Only the first sheet is read. One row per event.</p>
    </div>
  );
}

function SheetInput({ busy, token, setBusy, onRows }: { busy: boolean; token?: string; setBusy: (b: boolean) => void; onRows: (rows: unknown[][]) => Promise<void> }) {
  const [url, setUrl] = useState("");
  const toast = useToast();
  async function load() {
    setBusy(true);
    try {
      const res = await fetch("/api/sheet", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await onRows(Papa.parse<string[]>(data.csv, { skipEmptyLines: true }).data);
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <ol className="text-sm list-decimal pl-5 space-y-1">
        <li>
          New to this? In Google Sheets, open <b>File → Import</b> and upload our{" "}
          <a className="underline" href="/templates/nomadgao-events-template.xlsx" download>
            Excel template
          </a>
          . Keep that sheet and fill it every week.
        </li>
        <li>
          Click <b>Share → General access → &quot;Anyone with the link&quot;</b> (Viewer).
        </li>
        <li>Copy the link from the address bar and paste it here. The tab you have open is the one we read.</li>
      </ol>
      <div className="flex flex-wrap gap-3">
        <input className="input flex-1 min-w-[260px]" placeholder="https://docs.google.com/spreadsheets/d/…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn-primary" disabled={busy || !/docs\.google\.com\/spreadsheets/.test(url)} onClick={load}>
          {busy ? "Reading…" : "Read the sheet"}
        </button>
      </div>
    </div>
  );
}
