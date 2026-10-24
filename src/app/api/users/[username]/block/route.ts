import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { blocks, followRequests, follows, users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";

/** Toggle block. Blocking removes follows in both directions and pending requests. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ username: string }> }) => {
  assertSameOrigin(req);
  const { username } = await params;
  const user = await requireUser();
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
  if (!target || target.id === user.id) throw new ApiError("User not found", 404);
  const existing = await db.select().from(blocks).where(and(eq(blocks.blockerId, user.id), eq(blocks.blockedId, target.id)));
  if (existing.length) {
    await db.delete(blocks).where(and(eq(blocks.blockerId, user.id), eq(blocks.blockedId, target.id)));
    return json({ blocked: false });
  }
  await db.transaction(async (tx) => {
    await tx.insert(blocks).values({ blockerId: user.id, blockedId: target.id }).onConflictDoNothing();
    const pair = or(and(eq(follows.followerId, user.id), eq(follows.followingId, target.id)), and(eq(follows.followerId, target.id), eq(follows.followingId, user.id)));
    await tx.delete(follows).where(pair);
    await tx.delete(followRequests).where(or(and(eq(followRequests.requesterId, user.id), eq(followRequests.targetId, target.id)), and(eq(followRequests.requesterId, target.id), eq(followRequests.targetId, user.id))));
  });
  return json({ blocked: true });
});
