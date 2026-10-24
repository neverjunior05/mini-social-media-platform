import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers, type Viewer } from "@/components/providers";
import { getCurrentUser } from "@/lib/auth";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  metadataBase: new URL(site.url),
  manifest: "/manifest.json",
  openGraph: { title: site.name, description: site.description, siteName: site.name, type: "website", images: ["/api/og?title=Pebble"] },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FFF8F3" }, { media: "(prefers-color-scheme: dark)", color: "#140C16" }], width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const u = await getCurrentUser();
  const viewer: Viewer = u
    ? { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, role: u.role, isPrivate: u.isPrivate, reduceMotion: u.reduceMotion, soundEnabled: u.soundEnabled, accentColor: u.accentColor, takeABreak: u.takeABreak, onboarded: u.onboarded, interests: u.interests }
    : null;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Figtree:wght@400;500;600&family=Caveat:wght@600&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <Providers viewer={viewer}>{children}</Providers>
      </body>
    </html>
  );
}
