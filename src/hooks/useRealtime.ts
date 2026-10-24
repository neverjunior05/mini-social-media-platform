"use client";
import { useEffect } from "react";
import { useUiStore } from "@/store/useUiStore";
import { playSound } from "@/lib/client";

export type RealtimeEvent =
  | { type: "hello"; unreadNotifications: number; unreadMessages: number }
  | { type: "message"; conversationId: string; message: unknown; unreadMessages: number }
  | { type: "notification"; count: number }
  | { type: "typing"; conversationId: string; userId: string; username: string }
  | { type: "presence"; online: string[] };

/**
 * Server-Sent Events channel. One connection per tab; events are re-broadcast on `window`
 * so chat screens / feed can subscribe without prop drilling. Reconnects automatically.
 */
export function useRealtime(enabled: boolean) {
  const setUnread = useUiStore((s) => s.setUnread);
  useEffect(() => {
    if (!enabled) return;
    let es: EventSource | null = null;
    let closed = false;
    let retry = 1000;
    const connect = () => {
      if (closed) return;
      es = new EventSource("/api/realtime");
      es.onmessage = (e) => {
        retry = 1000;
        const ev = JSON.parse(e.data) as RealtimeEvent;
        if (ev.type === "hello") setUnread({ notifications: ev.unreadNotifications, messages: ev.unreadMessages });
        if (ev.type === "notification") setUnread({ notifications: ev.count });
        if (ev.type === "message") {
          setUnread({ messages: ev.unreadMessages });
          playSound("ping", useUiStore.getState().soundEnabled);
        }
        window.dispatchEvent(new CustomEvent("pebble:realtime", { detail: ev }));
      };
      es.onerror = () => {
        es?.close();
        if (!closed) setTimeout(connect, (retry = Math.min(retry * 2, 15000)));
      };
    };
    connect();
    return () => {
      closed = true;
      es?.close();
    };
  }, [enabled, setUnread]);
}

export function onRealtime(fn: (ev: RealtimeEvent) => void) {
  const h = (e: Event) => fn((e as CustomEvent<RealtimeEvent>).detail);
  window.addEventListener("pebble:realtime", h);
  return () => window.removeEventListener("pebble:realtime", h);
}
