import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appeals, auditLogs, posts, users } from "@/db/schema";
import { handler, json, assertSameOrigin } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { z } from "zod";

export const GET = handler(async () => {
  await requireRole(["moderator", "admin"]);
  const rows = await db
    .select({ a: appeals, username: users.username, postText: posts.text, removedReason: posts.removedReason })
    .from(appeals)
    .innerJoin(users, eq(users.id, appeals.userId))
    .leftJoin(posts, eq(posts.id, appeals.postId))
    .orderBy(desc(appeals.createdAt))
    .limit(100);
  return json({ appeals: rows.map((r) => ({ ...r.a, username: r.username, postText: r.postText, removedReason: r.removedReason })) });
});

/** Accept (restores the post) or reject an appeal. */
export const PATCH = handler(async (req: Request) => {
  assertSameOrigin(req);
  const mod = await requireRole(["moderator", "admin"]);
  const { id, accept } = z.object({ id: z.string(), accept: z.boolean() }).parse(await req.json());
  const [a] = await db.select().from(appeals).where(eq(appeals.id, id));
  if (!a) return json({ error: "Not found" }, { status: 404 });
  await db.update(appeals).set({ status: accept ? "accepted" : "rejected", decidedBy: mod.id }).where(eq(appeals.id, id));
  if (accept && a.postId) await db.update(posts).set({ deletedAt: null, removedReason: null }).where(eq(posts.id, a.postId));
  await db.insert(auditLogs).values({ actorId: mod.id, action: accept ? "appeal.accept" : "appeal.reject", targetType: "appeal", targetId: id, meta: { postId: a.postId } });
  await notify({ userId: a.userId, type: "moderation", postId: a.postId, meta: { message: accept ? "Your appeal was accepted and your post is restored." : "Your appeal was reviewed and the decision stands. Thanks for understanding." } });
  return json({ ok: true });
});
