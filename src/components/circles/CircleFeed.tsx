"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Composer } from "@/components/composer/Composer";
import { Feed } from "@/components/feed/Feed";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/client";
import type { FeedPost } from "@/lib/feed";

export function CircleFeed({ slug, circleId, canPost, initial }: { slug: string; circleId: string; canPost?: boolean; initial: { items: FeedPost[]; nextCursor: string | null } }) {
  return (
    <div className="space-y-4">
      {canPost && <Composer circleId={circleId} onPosted={(p) => window.dispatchEvent(new CustomEvent("pebble:new-post", { detail: p }))} />}
      <Feed endpoint={`/api/circles/${slug}/posts`} initial={initial} caughtUpText="That's everything in this circle" emptyTitle="No posts here yet" emptyHint="Start the first thread." />
    </div>
  );
}

CircleFeed.Pending = function Pending({ slug, pending }: { slug: string; pending: { id: string; username: string; displayName: string; avatarUrl: string }[] }) {
  const router = useRouter();
  const act = async (userId: string, action: "approve" | "decline") => {
    await api(`/api/circles/${slug}/join`, { method: "PATCH", json: { userId, action } });
    router.refresh();
  };
  return (
    <ul className="space-y-2">
      {pending.map((p) => (
        <li key={p.id} className="flex items-center gap-2"><Avatar src={p.avatarUrl} name={p.displayName} size={34} /><Link href={`/u/${p.username}`} className="flex-1 text-sm font-semibold">{p.displayName}</Link><button className="btn-primary min-h-9 px-3 text-xs" onClick={() => act(p.id, "approve")}>Approve</button><button className="btn-ghost min-h-9 px-3 text-xs" onClick={() => act(p.id, "decline")}>Decline</button></li>
      ))}
    </ul>
  );
};
