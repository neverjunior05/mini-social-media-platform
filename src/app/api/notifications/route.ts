import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { handler, json, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { groupNotifications, type NotifRow } from "@/lib/notifications";
import { hiddenUserIds } from "@/lib/permissions";
import { z } from "zod";

export const GET = handler(async () => {
  const user = await requireUser();
  const hidden = await hiddenUserIds(user.id);
  const rows = await db
    .select({ n: notifications, a: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl } })
    .from(notifications)
    .leftJoin(users, eq(users.id, notifications.actorId))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(150);
  const list: NotifRow[] = rows
    .filter((r) => !r.a || !hidden.has(r.a.id))
    .map((r) => ({ id: r.n.id, type: r.n.type, postId: r.n.postId, commentId: r.n.commentId, meta: r.n.meta, read: r.n.read, createdAt: r.n.createdAt, actor: r.a?.id ? r.a : null }));
  return json({ groups: groupNotifications(list), unread: list.filter((n) => !n.read).length });
});

/** Mark read (specific ids or all). */
export const PATCH = handler(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { ids } = z.object({ ids: z.array(z.string()).optional() }).parse(await req.json().catch(() => ({})));
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, user.id), ids?.length ? inArray(notifications.id, ids) : undefined));
  return json({ ok: true });
});
