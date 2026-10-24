import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "@/components/post/icons";
import { Feed } from "@/components/feed/Feed";
import { getCurrentUser } from "@/lib/auth";
import { discoverFeed } from "@/lib/feed";
import { circleMembershipMap } from "@/lib/permissions";

export const metadata: Metadata = { title: "Discover", description: "Recent popular posts from public accounts, circles and tags you follow." };
export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  const circles = user ? [...(await circleMembershipMap(user.id)).keys()] : [];
  const initial = await discoverFeed(user?.id ?? null, null, user?.interests ?? [], circles);
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">Discover</h1>
        <nav className="flex gap-1 rounded-full bg-elevated p-1 text-sm font-semibold" aria-label="Feed type">
          <Link href="/home" className="rounded-full px-4 py-1.5 text-muted hover:text-ink">Following</Link>
          <span className="rounded-full bg-surface px-4 py-1.5 shadow-sm" aria-current="page">Discover</span>
        </nav>
      </header>
      <details className="glass rounded-2xl px-4 py-3 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Info /> How Discover is ranked</summary>
        <p className="mt-2 text-muted">Public posts from the last 7 days are scored as <code className="rounded bg-elevated px-1">(reactions×1 + comments×2 + reposts×3 + 1) ÷ (hours old + 2)^1.5</code>, boosted ×1.5 when they use a tag you follow or come from one of your circles. No personal profile data, no outrage signals — and every card tells you why it's here.</p>
      </details>
      <Feed endpoint="/api/feed?type=discover" initial={JSON.parse(JSON.stringify(initial))} caughtUpText="That's all for today" emptyTitle="Nothing popular yet" emptyHint="Discover fills up as people react and comment." />
    </div>
  );
}
