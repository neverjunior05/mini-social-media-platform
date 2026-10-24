import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, dailyStats, notifications, pollVotes, polls, postHashtags, posts, reactions, stories, trendingTags, users, comments } from "@/db/schema";
import { site } from "@/config/site";

/**
 * Background worker jobs. They run:
 *  - on an interval inside the Next.js server (see src/instrumentation.ts), and
 *  - on demand via POST /api/worker/run (admin only).
 * Each job is idempotent so it is safe to run repeatedly.
 */
export async function expireStories() {
  const r = await db.update(stories).set({ expired: true }).where(and(eq(stories.expired, false), lt(stories.expiresAt, new Date()))).returning({ id: stories.id });
  return r.length;
}

export async function closePolls() {
  const due = await db.update(polls).set({ closed: true }).where(and(eq(polls.closed, false), lt(polls.endsAt, new Date()))).returning({ id: polls.id, postId: polls.postId });
  for (const p of due) {
    const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, p.postId));
    if (post) await db.insert(notifications).values({ userId: post.authorId, type: "poll_ended", postId: p.postId });
    // Notify voters too (grouped as "poll ended" in their inbox)
    const voters = await db.select({ userId: pollVotes.userId }).from(pollVotes).where(eq(pollVotes.pollId, p.id));
    if (voters.length) await db.insert(notifications).values(voters.filter((v) => v.userId !== post?.authorId).map((v) => ({ userId: v.userId, type: "poll_ended" as const, postId: p.postId })));
  }
  return due.length;
}

export async function publishScheduledPosts() {
  const r = await db
    .update(posts)
    .set({ published: true, createdAt: new Date() })
    .where(and(eq(posts.published, false), lt(posts.scheduledAt, new Date())))
    .returning({ id: posts.id });
  return r.length;
}

/** Trending = hashtag usage in the last 24h weighted by engagement, decayed by recency. */
export async function computeTrending() {
  const since = new Date(Date.now() - 86_400_000);
  const rows = await db
    .select({
      tag: postHashtags.tag,
      c: sql<number>`count(*)::int`,
      eng: sql<number>`coalesce(sum((select count(*) from ${reactions} r where r.post_id = ${posts.id})),0)::int`,
    })
    .from(postHashtags)
    .innerJoin(posts, eq(posts.id, postHashtags.postId))
    .where(and(gte(posts.createdAt, since), isNull(posts.deletedAt)))
    .groupBy(postHashtags.tag);
  await db.delete(trendingTags);
  if (rows.length) {
    await db.insert(trendingTags).values(rows.map((r) => ({ tag: r.tag, count24h: r.c, score: r.c * 2 + r.eng * 0.5, computedAt: new Date() })));
  }
  return rows.length;
}

/** Accounts past the deletion grace period are permanently removed (cascades everywhere). */
export async function deleteAccounts() {
  const cutoff = new Date(Date.now() - site.deletionGraceDays * 86_400_000);
  const r = await db.delete(users).where(lt(users.deletionRequestedAt, cutoff)).returning({ id: users.id });
  for (const u of r) await db.insert(auditLogs).values({ action: "account.deleted", targetType: "user", targetId: u.id, meta: { reason: "grace period elapsed" } });
  return r.length;
}

/** Upserts today's stats row for the analytics dashboard. */
export async function rollupDailyStats() {
  const day = new Date().toISOString().slice(0, 10);
  const start = new Date(day + "T00:00:00Z");
  const [[a], [p], [r], [c]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(users).where(gte(users.lastActiveAt, start)),
    db.select({ c: sql<number>`count(*)::int` }).from(posts).where(gte(posts.createdAt, start)),
    db.select({ c: sql<number>`count(*)::int` }).from(reactions).where(gte(reactions.createdAt, start)),
    db.select({ c: sql<number>`count(*)::int` }).from(comments).where(gte(comments.createdAt, start)),
  ]);
  await db
    .insert(dailyStats)
    .values({ day, activeUsers: a.c, posts: p.c, reactions: r.c, comments: c.c })
    .onConflictDoUpdate({ target: dailyStats.day, set: { activeUsers: a.c, posts: p.c, reactions: r.c, comments: c.c } });
}

export async function runAllJobs() {
  const results = {
    expiredStories: await expireStories(),
    closedPolls: await closePolls(),
    publishedScheduled: await publishScheduledPosts(),
    trendingTags: await computeTrending(),
    deletedAccounts: await deleteAccounts(),
  };
  await rollupDailyStats();
  return results;
}
