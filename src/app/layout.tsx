import type { Metadata, Viewport } from "next";
import "@fontsource/outfit/latin-300.css";
import "@fontsource/outfit/latin-400.css";
import "@fontsource/outfit/latin-500.css";
import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-700.css";
import "@fontsource/outfit/latin-800.css";
import "@fontsource/bricolage-grotesque/latin-800.css";
import "@fontsource/fraunces/latin-800.css";
import "@fontsource/unbounded/latin-700.css";
import "@fontsource/caprasimo/latin-400.css";
import "@fontsource/anton/latin-400.css";
import "@fontsource/caveat/latin-700.css";
import "./globals.css";
import { AuthProvider } from "@/components/app/Auth";
import { ToastProvider } from "@/components/app/Toast";

export const metadata: Metadata = {
  title: "NomadGao Events Studio",
  description: "Weekly event posters, calendars and captions for NomadGao Goa and Dharamkot.",
  icons: { icon: "/brand/icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#26341f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
