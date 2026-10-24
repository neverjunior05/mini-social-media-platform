import { ImageResponse } from "next/og";
export const runtime = "edge";
/** Dynamic Open Graph image in the Sunset Glass style. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") ?? "Pebble").slice(0, 90);
  const subtitle = (searchParams.get("subtitle") ?? "A calmer, prettier place for small circles.").slice(0, 120);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 64, background: "linear-gradient(135deg,#FFA877 0%,#FF5E6C 40%,#E83E9B 70%,#7B5CFF 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 700, marginBottom: "auto" }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "rgba(255,255,255,.85)" }} /> pebble
        </div>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
        <div style={{ fontSize: 30, opacity: 0.9, marginTop: 18 }}>{subtitle}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
