import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, posts, users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

export const GET = handler(async (req: Request) => {
  await requireRole(["moderator", "admin"]);
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const rows = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl, email: users.email, role: users.role, isPrivate: users.isPrivate, suspendedUntil: users.suspendedUntil, deletionRequestedAt: users.deletionRequestedAt, createdAt: users.createdAt, posts: sql<number>`(select count(*) from ${posts} where ${posts.authorId} = ${users.id})::int` })
    .from(users)
    .where(q ? or(ilike(users.username, `%${q}%`), ilike(users.displayName, `%${q}%`)) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(100);
  return json({ users: rows });
});

/** Admin: change role / suspend / unsuspend. Moderators may suspend only. */
export const PATCH = handler(async (req: Request) => {
  assertSameOrigin(req);
  const actor = await requireRole(["moderator", "admin"]);
  const body = z.object({ userId: z.string(), role: z.enum(["member", "moderator", "admin"]).optional(), suspendDays: z.number().int().min(0).max(365).optional(), reason: z.string().max(300).default("") }).parse(await req.json());
  if (body.userId === actor.id) throw new ApiError("You can't change your own account here");
  if (body.role !== undefined) {
    if (actor.role !== "admin") throw new ApiError("Admins only", 403);
    await db.update(users).set({ role: body.role }).where(eq(users.id, body.userId));
    await db.insert(auditLogs).values({ actorId: actor.id, action: "user.role", targetType: "user", targetId: body.userId, meta: { role: body.role } });
  }
  if (body.suspendDays !== undefined) {
    const until = body.suspendDays > 0 ? new Date(Date.now() + body.suspendDays * 86_400_000) : null;
    await db.update(users).set({ suspendedUntil: until }).where(eq(users.id, body.userId));
    await db.insert(auditLogs).values({ actorId: actor.id, action: until ? "user.suspend" : "user.unsuspend", targetType: "user", targetId: body.userId, meta: { days: body.suspendDays, reason: body.reason } });
  }
  return json({ ok: true });
});
