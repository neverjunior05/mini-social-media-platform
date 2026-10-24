import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { followRequests, follows, users } from "@/db/schema";
import { handler, json, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { z } from "zod";

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl, at: followRequests.createdAt })
    .from(followRequests)
    .innerJoin(users, eq(users.id, followRequests.requesterId))
    .where(eq(followRequests.targetId, user.id));
  return json({ requests: rows });
});

/** Accept or decline a pending follow request. */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { requesterId, accept } = z.object({ requesterId: z.string(), accept: z.boolean() }).parse(await req.json());
  await db.transaction(async (tx) => {
    const del = await tx.delete(followRequests).where(and(eq(followRequests.requesterId, requesterId), eq(followRequests.targetId, user.id))).returning();
    if (del.length && accept) {
      await tx.insert(follows).values({ followerId: requesterId, followingId: user.id }).onConflictDoNothing();
      await notify({ userId: requesterId, actorId: user.id, type: "follow_accepted" });
    }
  });
  return json({ ok: true });
});
