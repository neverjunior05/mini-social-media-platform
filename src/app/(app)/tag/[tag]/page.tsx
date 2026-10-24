import type { Metadata } from "next";
import { eq, exists, sql } from "drizzle-orm";
import { db } from "@/db";
import { postHashtags, posts } from "@/db/schema";
import { Feed } from "@/components/feed/Feed";
import { getCurrentUser } from "@/lib/auth";
import { postList } from "@/lib/feed";

type Props = { params: Promise<{ tag: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}`, description: `Posts tagged #${decodeURIComponent(tag)} on Pebble.` };
}
export default async function TagPage({ params }: Props) {
  const { tag: raw } = await params;
  const tag = decodeURIComponent(raw).toLowerCase();
  const user = await getCurrentUser();
  const where = [exists(db.select({ x: sql`1` }).from(postHashtags).where(sql`${postHashtags.postId} = ${posts.id} and ${postHashtags.tag} = ${tag}`))];
  const initial = await postList({ viewerId: user?.id ?? null, cursor: null, where });
  const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(postHashtags).where(eq(postHashtags.tag, tag));
  return (
    <div className="space-y-4">
      <header><h1 className="text-2xl">#{tag}</h1><p className="text-sm text-muted">{c} posts</p></header>
      <Feed endpoint={`/api/tags/${encodeURIComponent(tag)}`} initial={JSON.parse(JSON.stringify(initial))} caughtUpText="That's every post with this tag" emptyTitle="No posts yet" emptyHint="Be the first to use this tag." />
    </div>
  );
}
