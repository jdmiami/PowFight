import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { isDemo } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "The Play House", template: "%s · The Play House" },
  description: "Pick a character, selfie your lines, and watch the whole play come together. Audition, vote, and win the role.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "The Play House", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0e0608", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {isDemo && (
          <div className="bg-gold/15 text-gold text-center text-xs py-1 px-3 border-b border-gold/20">
            Demo mode: in-memory data, no payments. Set Supabase + Stripe keys to go live.
          </div>
        )}
        <main className="flex-1 w-full max-w-xl mx-auto px-4 pt-4 safe-bottom">{children}</main>
        <Nav />
      </body>
    </html>
  );
}
