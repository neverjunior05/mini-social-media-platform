"use client";
import Link from "next/link";
import { Composer } from "@/components/composer/Composer";
import { Feed } from "@/components/feed/Feed";
import type { FeedPost } from "@/lib/feed";

export function HomeFeed({ initial }: { initial: { items: FeedPost[]; nextCursor: string | null } }) {
  return (
    <>
      <Composer onPosted={(p) => window.dispatchEvent(new CustomEvent("pebble:new-post", { detail: p }))} />
      <p className="px-1 text-xs text-muted">Chronological · newest first · no ranking, ever.</p>
      <Feed endpoint="/api/feed?type=following" initial={initial} showNewPill emptyTitle="Your feed is quiet" emptyHint="Follow a few friendly accounts and their posts will show up here in order." emptyAction={<Link href="/discover" className="btn-primary mt-2">Explore Discover</Link>} />
    </>
  );
}
