import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { messages, notifications, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { myConversationIds, unreadMessageCount } from "@/lib/chat";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream: new messages, notification counts, presence.
 * Authenticated via the session cookie; only the viewer's own conversations are polled,
 * so room-level permissions are enforced by construction.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const enc = new TextEncoder();
  let timer: NodeJS.Timeout | null = null;
  let lastCheck = new Date();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      const [{ c: unreadNotifications }] = await db.select({ c: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
      send({ type: "hello", unreadNotifications, unreadMessages: await unreadMessageCount(user.id) });
      const tick = async () => {
        try {
          const now = new Date();
          const convIds = await myConversationIds(user.id);
          if (convIds.length) {
            const fresh = await db.select().from(messages).where(and(inArray(messages.conversationId, convIds), gt(messages.createdAt, lastCheck), sql`${messages.senderId} <> ${user.id}`));
            if (fresh.length) {
              const unread = await unreadMessageCount(user.id);
              for (const m of fresh) send({ type: "message", conversationId: m.conversationId, message: { ...m, reactions: [] }, unreadMessages: unread });
            }
          }
          const [{ c: newNotifs }] = await db.select({ c: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, user.id), gt(notifications.createdAt, lastCheck)));
          if (newNotifs > 0) {
            const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
            send({ type: "notification", count: c });
          }
          const online = await db.select({ id: users.id }).from(users).where(gt(users.lastActiveAt, new Date(Date.now() - 5 * 60_000)));
          send({ type: "presence", online: online.map((o) => o.id) });
          lastCheck = now;
        } catch {
          /* client gone */
        }
      };
      timer = setInterval(tick, 2500);
      req.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
