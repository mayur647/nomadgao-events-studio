import type { Metadata, Viewport } from "next";
import "@/brand/fonts";
import "./globals.css";
import { AuthProvider } from "@/components/app/Auth";
import { ToastProvider } from "@/components/app/Toast";
import { brandCss, logos, ui } from "@/brand/brand";

export const metadata: Metadata = {
  title: "NomadGao Events Studio",
  description: "Weekly event posters, calendars and captions for NomadGao Goa and Dharamkot.",
  icons: { icon: logos.icon },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: ui.moss };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style id="brand-tokens" dangerouslySetInnerHTML={{ __html: brandCss() }} />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
