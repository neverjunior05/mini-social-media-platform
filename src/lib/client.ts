"use client";
/** Tiny fetch wrapper used by every client component. Throws with the server's error message. */
export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.json !== undefined ? { "content-type": "application/json" } : {}), ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data;
}

/** Optional UI sounds (CC0). Off by default; never autoplays with sound unless enabled in settings. */
export function playSound(name: "pop" | "ping", enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const a = new Audio(`/sounds/${name}.mp3`);
    a.volume = 0.35;
    a.play().catch(() => {});
  } catch {}
}
