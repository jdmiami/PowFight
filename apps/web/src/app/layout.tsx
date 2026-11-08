import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fraunces, instrument } from "./fonts";
import { Nav } from "@/components/Nav";
import { isDemo } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "The Play House", template: "%s · The Play House" },
  description: "Pick a character, selfie your lines, and watch the whole play come together. Audition, vote, and win the role.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "The Play House", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#09070a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrument.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <div className="with-sidebar flex-1 flex flex-col min-h-full">{children}</div>
        {isDemo && <span className="fixed top-2 right-2 z-50 pill pill-glass text-[10px] pointer-events-none" aria-label="Demo mode">demo</span>}
        <Nav />
      </body>
    </html>
  );
}
