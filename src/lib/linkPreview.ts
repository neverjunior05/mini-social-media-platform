import { lookup } from "dns/promises";
import type { LinkPreview } from "@/db/schema";

/** Private / local IP ranges that must never be fetched (SSRF protection). */
function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return ip.startsWith("::ffff:") ? isPrivateIp(ip.slice(7)) : false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 4000;

function pick(html: string, re: RegExp) {
  const m = html.match(re);
  return m?.[1]?.trim().replace(/\s+/g, " ").slice(0, 300) ?? "";
}
function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/** Fetches OpenGraph metadata safely. Returns null on any failure (callers render a fallback card). */
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.hostname === "localhost" || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) return null;
  try {
    const addrs = await lookup(url.hostname, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) return null;
  } catch {
    return null;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "manual", headers: { "user-agent": "PebbleBot/1.0 (+link preview)", accept: "text/html" } });
    if (res.status >= 300 && res.status < 400) return null; // refuse redirects (could hop to private hosts)
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (received < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      received += value.length;
    }
    reader.cancel().catch(() => {});
    const html = new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
    const title = decode(pick(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || pick(html, /<title[^>]*>([^<]+)<\/title>/i));
    const description = decode(pick(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i) || pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i));
    const image = decode(pick(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i));
    const siteName = decode(pick(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i)) || url.hostname;
    if (!title) return null;
    let imageUrl: string | null = null;
    try {
      const iu = new URL(image, url);
      if (iu.protocol === "https:" || iu.protocol === "http:") imageUrl = iu.toString();
    } catch {}
    return { url: url.toString(), title, description, image: imageUrl, siteName };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
