import { and, desc, eq, gt, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { follows, stories, storyViews, users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { hiddenUserIds } from "@/lib/permissions";
import { storySchema } from "@/lib/validations";
import { site } from "@/config/site";

/** Active stories from people you follow (+ yours), grouped by author, with seen state. */
export const GET = handler(async () => {
  const user = await getCurrentUser();
  if (!user) return json({ groups: [] });
  const f = await db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, user.id));
  const authorIds = [user.id, ...f.map((x) => x.id)];
  const hidden = await hiddenUserIds(user.id);
  const rows = await db
    .select({ s: stories, u: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl, lastActiveAt: users.lastActiveAt } })
    .from(stories)
    .innerJoin(users, eq(users.id, stories.authorId))
    .where(and(inArray(stories.authorId, authorIds), eq(stories.expired, false), gt(stories.expiresAt, new Date()), hidden.size ? notInArray(stories.authorId, [...hidden]) : undefined))
    .orderBy(desc(stories.createdAt));
  const ids = rows.map((r) => r.s.id);
  const seen = ids.length ? await db.select({ id: storyViews.storyId }).from(storyViews).where(and(inArray(storyViews.storyId, ids), eq(storyViews.viewerId, user.id))) : [];
  const seenSet = new Set(seen.map((s) => s.id));
  const groups = new Map<string, { author: (typeof rows)[number]["u"]; stories: Array<typeof rows[number]["s"] & { seen: boolean }>; allSeen: boolean }>();
  for (const r of rows) {
    const g = groups.get(r.u.id) ?? { author: r.u, stories: [], allSeen: true };
    const isSeen = seenSet.has(r.s.id);
    g.stories.push({ ...r.s, seen: isSeen });
    if (!isSeen) g.allSeen = false;
    groups.set(r.u.id, g);
  }
  const list = [...groups.values()].map((g) => ({ ...g, stories: g.stories.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) }));
  // Own stories first, then unseen, then seen
  list.sort((a, b) => (a.author.id === user.id ? -1 : b.author.id === user.id ? 1 : Number(a.allSeen) - Number(b.allSeen)));
  return json({ groups: list });
});

export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const body = storySchema.parse(await req.json());
  if (body.type === "image" && !body.imageUrl) throw new ApiError("Add an image URL");
  if (body.type === "text" && !body.text?.trim()) throw new ApiError("Write something");
  const [s] = await db
    .insert(stories)
    .values({ authorId: user.id, type: body.type, imageUrl: body.imageUrl ?? null, text: body.text ?? null, bgStyle: body.bgStyle, expiresAt: new Date(Date.now() + site.storyHours * 3_600_000) })
    .returning();
  return json({ story: s }, { status: 201 });
});
