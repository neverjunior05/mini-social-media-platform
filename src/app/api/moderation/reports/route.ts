import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, comments, dailyStats, posts, reports, users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { z } from "zod";
import { sql } from "drizzle-orm";

/** Reports queue with context (the reported post/comment/user). */
export const GET = handler(async (req: Request) => {
  await requireRole(["moderator", "admin"]);
  const status = new URL(req.url).searchParams.get("status") ?? "open";
  const rows = await db.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt)).limit(100);
  const out = [];
  for (const r of rows) {
    let context: unknown = null;
    if (r.targetType === "post") {
      const [p] = await db.select({ id: posts.id, text: posts.text, authorId: posts.authorId, deletedAt: posts.deletedAt, username: users.username }).from(posts).innerJoin(users, eq(users.id, posts.authorId)).where(eq(posts.id, r.targetId));
      context = p ?? null;
    } else if (r.targetType === "comment") {
      const [c] = await db.select({ id: comments.id, text: comments.text, authorId: comments.authorId, postId: comments.postId, username: users.username }).from(comments).innerJoin(users, eq(users.id, comments.authorId)).where(eq(comments.id, r.targetId));
      context = c ?? null;
    } else if (r.targetType === "user") {
      const [u] = await db.select({ id: users.id, username: users.username, displayName: users.displayName, bio: users.bio, suspendedUntil: users.suspendedUntil }).from(users).where(eq(users.id, r.targetId));
      context = u ?? null;
    }
    const [reporter] = r.reporterId ? await db.select({ username: users.username }).from(users).where(eq(users.id, r.reporterId)) : [null];
    out.push({ ...r, context, reporter: reporter?.username ?? "deleted user" });
  }
  return json({ reports: out });
});

/** Resolve a report: dismiss | remove | warn | suspend. Every action is audit-logged and the affected user is told why. */
export const PATCH = handler(async (req: Request) => {
  assertSameOrigin(req);
  const mod = await requireRole(["moderator", "admin"]);
  const { id, action, reason, days } = z.object({ id: z.string(), action: z.enum(["dismiss", "remove", "warn", "suspend"]), reason: z.string().max(300).default(""), days: z.number().int().min(1).max(365).default(7) }).parse(await req.json());
  const [r] = await db.select().from(reports).where(eq(reports.id, id));
  if (!r) throw new ApiError("Report not found", 404);
  let affectedUser: string | null = null;
  if (r.targetType === "post") {
    const [p] = await db.select().from(posts).where(eq(posts.id, r.targetId));
    affectedUser = p?.authorId ?? null;
    if (action === "remove" && p) await db.update(posts).set({ deletedAt: new Date(), removedReason: reason || `Removed by moderators (${r.reason}).` }).where(eq(posts.id, p.id));
  } else if (r.targetType === "comment") {
    const [c] = await db.select().from(comments).where(eq(comments.id, r.targetId));
    affectedUser = c?.authorId ?? null;
    if (action === "remove" && c) await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, c.id));
  } else if (r.targetType === "user") {
    affectedUser = r.targetId;
  }
  if (action === "suspend" && affectedUser) await db.update(users).set({ suspendedUntil: new Date(Date.now() + days * 86_400_000) }).where(eq(users.id, affectedUser));
  await db.update(reports).set({ status: action === "dismiss" ? "dismissed" : "resolved", resolution: action, resolvedBy: mod.id, resolvedAt: new Date() }).where(eq(reports.id, id));
  await db.insert(auditLogs).values({ actorId: mod.id, action: `report.${action}`, targetType: r.targetType, targetId: r.targetId, meta: { reportId: id, reason, days: action === "suspend" ? days : undefined } });
  if (affectedUser && action !== "dismiss") {
    const msg = action === "remove" ? `Your ${r.targetType} was removed: ${reason || r.reason}. You can appeal.` : action === "warn" ? `A moderator sent a warning: ${reason || r.reason}. Please review the community guidelines.` : `Your account was suspended for ${days} days: ${reason || r.reason}. You can appeal from Settings.`;
    await notify({ userId: affectedUser, type: "moderation", postId: r.targetType === "post" ? r.targetId : null, meta: { message: msg } });
  }
  const day = new Date().toISOString().slice(0, 10);
  await db.insert(dailyStats).values({ day, reportsResolved: 1 }).onConflictDoUpdate({ target: dailyStats.day, set: { reportsResolved: sql`${dailyStats.reportsResolved} + 1` } });
  return json({ ok: true });
});
