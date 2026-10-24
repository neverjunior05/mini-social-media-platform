"use client";
import { Composer } from "@/components/composer/Composer";
import type { FeedPost } from "@/lib/feed";
export function GlobalComposer() {
  return <Composer inline={false} onPosted={(p: FeedPost) => window.dispatchEvent(new CustomEvent("pebble:new-post", { detail: p }))} />;
}
