import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversationMembers, messageReactions, messages } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  const { messageId, emoji } = z.object({ messageId: z.string(), emoji: z.string().max(8).nullable() }).parse(await req.json());
  const [m] = await db.select().from(messages).where(and(eq(messages.id, messageId), eq(messages.conversationId, id)));
  if (!m) throw new ApiError("Not found", 404);
  const [member] = await db.select().from(conversationMembers).where(and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, user.id)));
  if (!member) throw new ApiError("Not allowed", 403);
  await db.delete(messageReactions).where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, user.id)));
  if (emoji) await db.insert(messageReactions).values({ messageId, userId: user.id, emoji });
  return json({ ok: true });
});
