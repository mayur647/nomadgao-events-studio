"use client";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { toBlob } from "html-to-image";
import QRCode from "qrcode";

/* ───────────────────────── image helpers ───────────────────────── */
const dataUrlCache = new Map<string, Promise<string | null>>();

/** Fetch an image once and keep it as a data URL so exports never hit CORS or timing issues. */
export function toDataUrl(url: string | null): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  if (url.startsWith("data:")) return Promise.resolve(url);
  if (!dataUrlCache.has(url)) {
    dataUrlCache.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then(
          (b) =>
            new Promise<string>((res, rej) => {
              const fr = new FileReader();
              fr.onload = () => res(fr.result as string);
              fr.onerror = rej;
              fr.readAsDataURL(b);
            })
        )
        .catch(() => null)
    );
  }
  return dataUrlCache.get(url)!;
}

const qrCache = new Map<string, Promise<string>>();
export function qrDataUrl(text: string) {
  if (!qrCache.has(text)) qrCache.set(text, QRCode.toDataURL(text, { margin: 1, width: 420, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } }));
  return qrCache.get(text)!;
}

/** Shrink a photo before upload: max 1600px, JPEG. Keeps the free storage tier happy. */
export async function compressImage(file: File, max = 1600, quality = 0.85): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not process image"))), "image/jpeg", quality));
}

/* ───────────────────────── rendering a poster to PNG ───────────────────────── */
let queue: Promise<unknown> = Promise.resolve();

async function waitForImages(el: HTMLElement) {
  const imgs = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? img.decode().catch(() => undefined)
        : new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
            setTimeout(res, 6000);
          })
    )
  );
}
const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

/** Render a React poster off-screen at full size and capture it as a PNG blob. */
export function renderPng(node: ReactNode, w: number, h: number): Promise<Blob> {
  const job = queue.then(async () => {
    const host = document.createElement("div");
    host.style.cssText = `position:fixed;left:-${w + 4000}px;top:0;width:${w}px;height:${h}px;overflow:hidden;pointer-events:none;`;
    document.body.appendChild(host);
    const root = createRoot(host);
    try {
      flushSync(() => root.render(node));
      await document.fonts.ready;
      await frame();
      await waitForImages(host);
      await frame();
      await new Promise((r) => setTimeout(r, 120));
      await frame();
      const target = host.firstElementChild as HTMLElement;
      const opts = { width: w, height: h, pixelRatio: 1, cacheBust: false, skipAutoScale: true };
      // first pass warms font/image embedding (a known html-to-image quirk); second is the keeper
      await toBlob(target, opts).catch(() => null);
      const blob = await toBlob(target, opts);
      if (!blob) throw new Error("Could not create the image");
      return blob;
    } finally {
      root.unmount();
      host.remove();
    }
  });
  queue = job.catch(() => undefined);
  return job;
}

/* ───────────────────────── saving & sharing ───────────────────────── */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function zipFiles(files: { name: string; data: Blob | string }[]) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.data);
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export async function copyImage(blob: Blob) {
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

export function canShareFiles() {
  try {
    const f = new File([new Blob(["x"], { type: "image/png" })], "x.png", { type: "image/png" });
    return typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [f] });
  } catch {
    return false;
  }
}

/** Native share sheet (WhatsApp, Instagram, etc.) with the poster + caption. */
export async function shareFiles(files: File[], text: string, title: string) {
  if (!navigator.canShare || !navigator.canShare({ files })) return "unsupported" as const;
  // Some apps (WhatsApp on iPhone) drop text when an image is shared, so put the caption on the clipboard too.
  await copyText(text);
  try {
    await navigator.share({ files, text, title });
    return "shared" as const;
  } catch (e) {
    if ((e as Error).name === "AbortError") return "cancelled" as const;
    throw e;
  }
}

/** Opens WhatsApp (app or web) with the caption ready and the poster on the clipboard. */
export async function openWhatsApp(blob: Blob, caption: string) {
  const copied = await copyImage(blob);
  window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank", "noopener");
  return copied;
}

export function safeName(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "poster";
}
