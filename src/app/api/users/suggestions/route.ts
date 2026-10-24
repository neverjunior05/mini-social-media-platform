import { and, eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { handler, json } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { hiddenUserIds } from "@/lib/permissions";

/** Suggested accounts: public, not followed, not blocked, sharing interests first, then most-followed. */
export const GET = handler(async () => {
  const user = await getCurrentUser();
  const exclude = new Set<string>();
  if (user) {
    exclude.add(user.id);
    (await db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, user.id))).forEach((r) => exclude.add(r.id));
    (await hiddenUserIds(user.id)).forEach((id) => exclude.add(id));
  }
  const rows = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl, bio: users.bio, interests: users.interests, isPrivate: users.isPrivate, followers: sql<number>`(select count(*) from ${follows} where ${follows.followingId} = ${users.id})::int` })
    .from(users)
    .where(and(eq(users.isPrivate, false), exclude.size ? notInArray(users.id, [...exclude]) : undefined, sql`${users.suspendedUntil} is null or ${users.suspendedUntil} < now()`))
    .limit(40);
  const mine = new Set(user?.interests ?? []);
  rows.sort((a, b) => b.interests.filter((i) => mine.has(i)).length - a.interests.filter((i) => mine.has(i)).length || b.followers - a.followers);
  return json({ users: rows.slice(0, 12) });
});
