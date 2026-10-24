/** Shared helpers (safe on client and server). */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function timeAgo(date: Date | string, now = Date.now()) {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.max(0, Math.floor((now - d.getTime()) / 1000));
  if (s < 45) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  if (days < 365) return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatCount(n: number) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

export const HASHTAG_RE = /(^|[^\w&/])#([\p{L}\p{N}_]{1,40})/gu;
export const MENTION_RE = /(^|[^\w@/])@([a-z0-9_]{2,24})/giu;

/** Extracts unique, lowercase hashtags (no '#'). */
export function parseHashtags(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(HASHTAG_RE)) out.add(m[2].toLowerCase());
  return [...out].slice(0, 10);
}

/** Extracts unique, lowercase usernames mentioned with '@'. */
export function parseMentions(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) out.add(m[2].toLowerCase());
  return [...out].slice(0, 10);
}

export const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
export function extractUrls(text: string) {
  return (text.match(URL_RE) ?? []).slice(0, 3);
}

/** Only http(s) URLs are allowed for images/links; everything else is dropped. */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
/** Usernames that could impersonate staff or system features are reserved. */
export const RESERVED_USERNAMES = new Set(["admin", "administrator", "pebble", "support", "help", "moderator", "mod", "staff", "official", "root", "system", "security", "api", "login", "register", "settings"]);

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 40);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Splits text into tokens so the client can render hashtags/mentions/links as safe React nodes (never raw HTML). */
export type TextToken = { kind: "text" | "hashtag" | "mention" | "link"; value: string };
export function tokenize(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  const re = /(https?:\/\/[^\s<>"')\]]+)|(?:(^|[^\w&/])#([\p{L}\p{N}_]{1,40}))|(?:(^|[^\w@/])@([a-z0-9_]{2,24}))/giu;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (m[1]) {
      if (idx > last) tokens.push({ kind: "text", value: text.slice(last, idx) });
      tokens.push({ kind: "link", value: m[1] });
      last = idx + m[0].length;
    } else if (m[3] !== undefined) {
      const lead = m[2] ?? "";
      if (idx + lead.length > last) tokens.push({ kind: "text", value: text.slice(last, idx + lead.length) });
      tokens.push({ kind: "hashtag", value: m[3] });
      last = idx + m[0].length;
    } else if (m[5] !== undefined) {
      const lead = m[4] ?? "";
      if (idx + lead.length > last) tokens.push({ kind: "text", value: text.slice(last, idx + lead.length) });
      tokens.push({ kind: "mention", value: m[5] });
      last = idx + m[0].length;
    }
  }
  if (last < text.length) tokens.push({ kind: "text", value: text.slice(last) });
  return tokens;
}

/** Simple duplicate-content fingerprint for spam control. */
export function fingerprint(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}

export function containsMutedWord(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((w) => w && lower.includes(w.toLowerCase()));
}

export function encodeCursor(obj: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
export function decodeCursor<T>(cursor: string | null): T | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString()) as T;
  } catch {
    return null;
  }
}
