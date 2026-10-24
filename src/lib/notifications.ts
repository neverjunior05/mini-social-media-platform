import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users, type NotificationType } from "@/db/schema";

/**
 * Creates a notification unless the recipient disabled this type, is on a break,
 * or the actor is the recipient. Self-dedupe for repeated reactions.
 */
export async function notify(opts: {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
  meta?: Record<string, string>;
}) {
  if (opts.actorId && opts.actorId === opts.userId) return;
  const [recipient] = await db.select({ prefs: users.notifPrefs, brk: users.takeABreak }).from(users).where(eq(users.id, opts.userId));
  if (!recipient) return;
  if (recipient.brk && opts.type !== "moderation") return;
  if (recipient.prefs?.[opts.type] === false) return;
  if (opts.type === "reaction" && opts.actorId && opts.postId) {
    await db
      .delete(notifications)
      .where(and(eq(notifications.userId, opts.userId), eq(notifications.actorId, opts.actorId), eq(notifications.type, "reaction"), eq(notifications.postId, opts.postId)));
  }
  await db.insert(notifications).values({
    userId: opts.userId,
    actorId: opts.actorId ?? null,
    type: opts.type,
    postId: opts.postId ?? null,
    commentId: opts.commentId ?? null,
    meta: opts.meta ?? null,
  });
}

export { groupNotifications, groupLabel } from "./notifGroup";
export type { NotifActor, NotifRow, NotifGroup } from "./notifGroup";
