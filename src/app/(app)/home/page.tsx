import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { followingFeed } from "@/lib/feed";
import { StoriesRow } from "@/components/stories/Stories";
import { HomeFeed } from "./HomeFeed";

export const metadata: Metadata = { title: "Home", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/home");
  const initial = await followingFeed(user.id, null);
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">Home</h1>
        <nav className="flex gap-1 rounded-full bg-elevated p-1 text-sm font-semibold" aria-label="Feed type">
          <span className="rounded-full bg-surface px-4 py-1.5 shadow-sm" aria-current="page">Following</span>
          <Link href="/discover" className="rounded-full px-4 py-1.5 text-muted hover:text-ink">Discover</Link>
        </nav>
      </header>
      {user.takeABreak && <p className="rounded-2xl bg-mint/15 px-4 py-2 text-sm">🌿 You're on a break — notifications are paused. <Link href="/settings#safety" className="font-semibold underline">Change</Link></p>}
      <StoriesRow />
      <HomeFeed initial={JSON.parse(JSON.stringify(initial))} />
    </div>
  );
}
