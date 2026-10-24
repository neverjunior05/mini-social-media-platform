import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { circleMembers, circles, trendingTags } from "@/db/schema";
import { TrendingList, SuggestedUsers } from "./RightPanelClient";
import { credits } from "@/config/media";

/** Desktop right column: trending (24h, real activity), suggested accounts, circles, footer. Server component. */
export async function RightPanel() {
  const [tags, topCircles] = await Promise.all([
    db.select().from(trendingTags).orderBy(desc(trendingTags.score)).limit(6),
    db
      .select({ id: circles.id, slug: circles.slug, name: circles.name, isPrivate: circles.isPrivate, members: sql<number>`count(${circleMembers.userId})::int` })
      .from(circles)
      .leftJoin(circleMembers, eq(circleMembers.circleId, circles.id))
      .where(eq(circles.isPrivate, false))
      .groupBy(circles.id)
      .orderBy(desc(sql`count(${circleMembers.userId})`))
      .limit(4),
  ]);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[320px] shrink-0 flex-col gap-4 overflow-y-auto py-5 pl-6 no-scrollbar xl:flex" aria-label="Discover more">
      <section className="card p-4">
        <h2 className="mb-2 text-base">Trending now <span className="text-xs font-normal text-muted">· last 24h</span></h2>
        <TrendingList tags={tags.map((t) => ({ tag: t.tag, count: t.count24h }))} />
      </section>
      <section className="card p-4">
        <h2 className="mb-2 text-base">People you might like</h2>
        <SuggestedUsers />
      </section>
      <section className="card p-4">
        <h2 className="mb-2 text-base">Circles</h2>
        <ul className="space-y-1.5">
          {topCircles.map((c) => (
            <li key={c.id}><Link href={`/circles/${c.slug}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm hover:bg-elevated"><span className="font-semibold">{c.name}</span><span className="text-xs text-muted">{c.members} members</span></Link></li>
          ))}
        </ul>
        <Link href="/circles" className="mt-2 inline-block text-sm font-semibold text-coral-deep dark:text-peach">Browse all circles →</Link>
      </section>
      <footer className="px-2 text-xs text-muted">
        <p className="mb-1"><strong>Demo platform.</strong> All users, posts, photos and messages are fictional test data.</p>
        <p className="space-x-2"><Link href="/policies" className="hover:underline">Policies</Link><Link href="/policies#credits" className="hover:underline">Credits</Link><a href="https://github.com" className="hover:underline">Source</a></p>
        <details className="mt-1"><summary className="cursor-pointer">Media credits</summary><ul className="mt-1 space-y-0.5">{credits.map((c) => <li key={c.name}><a href={c.url} className="hover:underline">{c.name}</a> — {c.license}</li>)}</ul></details>
      </footer>
    </aside>
  );
}
