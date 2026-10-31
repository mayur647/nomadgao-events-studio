"use client";
import { addDays, parseDate, toISO, weekRange } from "@/lib/format";

export function WeekPicker({ week, onChange }: { week: string; onChange: (w: string) => void }) {
  const shift = (n: number) => onChange(toISO(addDays(parseDate(week), n * 7)));
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-white overflow-hidden">
      <button className="px-3 py-2 hover:bg-matcha-soft font-bold" onClick={() => shift(-1)} aria-label="Previous week">
        ‹
      </button>
      <div className="px-3 py-2 font-semibold min-w-[150px] text-center">Week of {weekRange(week)}</div>
      <button className="px-3 py-2 hover:bg-matcha-soft font-bold" onClick={() => shift(1)} aria-label="Next week">
        ›
      </button>
    </div>
  );
}
