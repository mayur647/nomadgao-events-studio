"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Shows a full-size poster scaled down to fit its column. */
export function Preview({ w, h, children, maxH }: { w: number; h: number; children: ReactNode; maxH?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth));
    ro.observe(el);
    setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  let scale = cw / w;
  if (maxH && h * scale > maxH) scale = maxH / h;
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <div style={{ width: w * scale, height: h * scale, overflow: "hidden", margin: "0 auto", borderRadius: 10, boxShadow: "0 6px 24px rgba(31,42,28,.18)" }}>
        <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
      </div>
    </div>
  );
}
