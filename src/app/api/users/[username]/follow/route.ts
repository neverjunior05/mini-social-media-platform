import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { followRequests, follows, users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { isBlockedEitherWay } from "@/lib/permissions";
import { LIMITS, rateLimit } from "@/lib/rateLimit";

type Ctx = { params: Promise<{ username: string }> };

/** Toggle follow. Private targets get a follow request instead. Runs in a transaction and is idempotent. */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  const { username } = await params;
  const user = await requireUser();
  rateLimit(`follow:${user.id}`, LIMITS.follow);
  const [target] = await db.select().from(users).where(eq(users.username, username));
  if (!target) throw new ApiError("User not found", 404);
  if (target.id === user.id) throw new ApiError("You can't follow yourself");
  if (await isBlockedEitherWay(user.id, target.id)) throw new ApiError("You can't follow this account", 403);

  return db.transaction(async (tx) => {
    const existing = await tx.select().from(follows).where(and(eq(follows.followerId, user.id), eq(follows.followingId, target.id)));
    if (existing.length) {
      await tx.delete(follows).where(and(eq(follows.followerId, user.id), eq(follows.followingId, target.id)));
      return json({ state: "none" });
    }
    const pending = await tx.select().from(followRequests).where(and(eq(followRequests.requesterId, user.id), eq(followRequests.targetId, target.id)));
    if (pending.length) {
      await tx.delete(followRequests).where(and(eq(followRequests.requesterId, user.id), eq(followRequests.targetId, target.id)));
      return json({ state: "none" });
    }
    if (target.isPrivate) {
      await tx.insert(followRequests).values({ requesterId: user.id, targetId: target.id }).onConflictDoNothing();
      await notify({ userId: target.id, actorId: user.id, type: "follow_request" });
      return json({ state: "requested" });
    }
    await tx.insert(follows).values({ followerId: user.id, followingId: target.id }).onConflictDoNothing();
    await notify({ userId: target.id, actorId: user.id, type: "follow" });
    return json({ state: "following" });
  });
});
