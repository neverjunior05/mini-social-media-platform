import { and, eq, or, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { blocks, circleMembers, circles, follows, mutes, mutedWords, users } from "@/db/schema";

/** Users hidden from the viewer: anyone they blocked, anyone who blocked them, plus muted accounts. */
export async function hiddenUserIds(viewerId: string | null): Promise<Set<string>> {
  if (!viewerId) return new Set();
  const [b, m] = await Promise.all([
    db
      .select({ a: blocks.blockerId, b: blocks.blockedId })
      .from(blocks)
      .where(or(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, viewerId))),
    db.select({ id: mutes.mutedId }).from(mutes).where(eq(mutes.muterId, viewerId)),
  ]);
  const set = new Set<string>();
  for (const r of b) set.add(r.a === viewerId ? r.b : r.a);
  for (const r of m) set.add(r.id);
  return set;
}

/** Only block relationships (used for messaging, profiles). */
export async function isBlockedEitherWay(a: string, b: string) {
  const rows = await db
    .select({ x: blocks.blockerId })
    .from(blocks)
    .where(or(and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)), and(eq(blocks.blockerId, b), eq(blocks.blockedId, a))))
    .limit(1);
  return rows.length > 0;
}

export async function isFollowing(followerId: string, followingId: string) {
  const rows = await db
    .select({ f: follows.followerId })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .limit(1);
  return rows.length > 0;
}

export async function followingIds(userId: string) {
  const rows = await db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, userId));
  return rows.map((r) => r.id);
}

/** Private accounts are only visible to approved followers (and themselves / staff). */
export async function canViewProfileContent(viewer: { id: string; role: string } | null, target: { id: string; isPrivate: boolean }) {
  if (!target.isPrivate) return true;
  if (!viewer) return false;
  if (viewer.id === target.id || viewer.role === "admin" || viewer.role === "moderator") return true;
  return isFollowing(viewer.id, target.id);
}

export async function circleMembershipMap(userId: string | null) {
  if (!userId) return new Map<string, string>();
  const rows = await db
    .select({ circleId: circleMembers.circleId, role: circleMembers.role })
    .from(circleMembers)
    .where(and(eq(circleMembers.userId, userId), eq(circleMembers.status, "active")));
  return new Map(rows.map((r) => [r.circleId, r.role]));
}

export async function canViewCircle(userId: string | null, circle: { id: string; isPrivate: boolean }) {
  if (!circle.isPrivate) return true;
  if (!userId) return false;
  const m = await circleMembershipMap(userId);
  return m.has(circle.id);
}

/** IDs of private circles the viewer is NOT in — posts inside them must never surface. */
export async function forbiddenCircleIds(userId: string | null) {
  const priv = await db.select({ id: circles.id }).from(circles).where(eq(circles.isPrivate, true));
  const mine = await circleMembershipMap(userId);
  return priv.map((c) => c.id).filter((id) => !mine.has(id));
}

/** IDs of private users the viewer does not follow (and isn't). */
export async function forbiddenPrivateAuthorIds(userId: string | null) {
  const priv = await db.select({ id: users.id }).from(users).where(eq(users.isPrivate, true));
  if (!userId) return priv.map((p) => p.id);
  const f = new Set(await followingIds(userId));
  return priv.map((p) => p.id).filter((id) => id !== userId && !f.has(id));
}

export async function suspendedUserIds() {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.suspendedUntil} > now()`);
  return rows.map((r) => r.id);
}

export async function mutedWordsFor(userId: string | null) {
  if (!userId) return [] as string[];
  const rows = await db.select({ w: mutedWords.word }).from(mutedWords).where(eq(mutedWords.userId, userId));
  return rows.map((r) => r.w);
}

/** Convenience: everything a feed query must exclude for a viewer. */
export async function visibilityFilters(viewerId: string | null) {
  const [hidden, privAuthors, privCircles, suspended, words] = await Promise.all([
    hiddenUserIds(viewerId),
    forbiddenPrivateAuthorIds(viewerId),
    forbiddenCircleIds(viewerId),
    suspendedUserIds(),
    mutedWordsFor(viewerId),
  ]);
  const excludedAuthors = new Set<string>([...hidden, ...privAuthors, ...suspended]);
  if (viewerId) excludedAuthors.delete(viewerId);
  return { excludedAuthors: [...excludedAuthors], excludedCircles: privCircles, mutedWords: words };
}

export async function usersByIds(ids: string[]) {
  if (!ids.length) return [];
  return db.select().from(users).where(inArray(users.id, ids));
}
