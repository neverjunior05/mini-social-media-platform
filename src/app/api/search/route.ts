import { and, desc, eq, ilike, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { circles, postHashtags, posts, recentSearches, users } from "@/db/schema";
import { handler, json } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { hydratePosts } from "@/lib/feed";
import { visibilityFilters } from "@/lib/permissions";
import { LIMITS, rateLimit } from "@/lib/rateLimit";

/** Search users, posts, hashtags and circles. Private content never leaks: posts go through visibility filters. */
export const GET = handler(async (req: Request) => {
  const user = await getCurrentUser();
  rateLimit(`search:${user?.id ?? req.headers.get("x-forwarded-for") ?? "anon"}`, LIMITS.search);
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  const save = url.searchParams.get("save") === "1";
  if (!q) {
    const recent = user ? await db.select({ q: recentSearches.query }).from(recentSearches).where(eq(recentSearches.userId, user.id)).orderBy(desc(recentSearches.createdAt)).limit(6) : [];
    return json({ users: [], posts: [], tags: [], circles: [], recent: recent.map((r) => r.q) });
  }
  if (save && user) await db.insert(recentSearches).values({ userId: user.id, query: q }).onConflictDoUpdate({ target: [recentSearches.userId, recentSearches.query], set: { createdAt: new Date() } });
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const v = await visibilityFilters(user?.id ?? null);
  const tagQ = q.replace(/^#/, "").toLowerCase();
  const [userRows, tagRows, circleRows, postRows] = await Promise.all([
    db
      .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl, bio: users.bio, isPrivate: users.isPrivate })
      .from(users)
      .where(and(or(ilike(users.username, like), ilike(users.displayName, like)), v.excludedAuthors.length ? notInArray(users.id, v.excludedAuthors.filter((id) => id !== user?.id)) : undefined))
      .limit(8),
    db
      .select({ tag: postHashtags.tag, c: sql<number>`count(*)::int` })
      .from(postHashtags)
      .where(ilike(postHashtags.tag, `${tagQ}%`))
      .groupBy(postHashtags.tag)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db.select().from(circles).where(and(eq(circles.isPrivate, false), or(ilike(circles.name, like), ilike(circles.description, like)))).limit(6),
    db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          ilike(posts.text, like),
          isNull(posts.deletedAt),
          eq(posts.published, true),
          v.excludedAuthors.length ? notInArray(posts.authorId, v.excludedAuthors) : undefined,
          v.excludedCircles.length ? sql`(${posts.circleId} IS NULL OR ${posts.circleId} NOT IN ${v.excludedCircles})` : undefined,
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(12),
  ]);
  const postItems = await hydratePosts(postRows.map((p) => p.id), user?.id ?? null);
  return json({ users: userRows, tags: tagRows, circles: circleRows.map((c) => ({ id: c.id, slug: c.slug, name: c.name, description: c.description, coverUrl: c.coverUrl })), posts: postItems, recent: [] });
});
