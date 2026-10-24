import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { conversationMembers, conversations, follows, users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { conversationSummaries, myConversationIds } from "@/lib/chat";
import { isBlockedEitherWay } from "@/lib/permissions";
import { conversationSchema } from "@/lib/validations";

export const GET = handler(async () => {
  const user = await requireUser();
  return json({ conversations: await conversationSummaries(user.id) });
});

/** Start a 1:1 (reuses existing) or group chat (≤ 8). Respects "who can message me" + blocks. */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const body = conversationSchema.parse(await req.json());
  const memberIds = [...new Set(body.memberIds.filter((id) => id !== user.id))];
  if (!memberIds.length) throw new ApiError("Pick at least one person");
  const targets = await db.select().from(users).where(inArray(users.id, memberIds));
  for (const t of targets) {
    if (await isBlockedEitherWay(user.id, t.id)) throw new ApiError(`You can't message ${t.displayName}`, 403);
    if (t.allowMessagesFrom === "nobody") throw new ApiError(`${t.displayName} isn't accepting messages`, 403);
    if (t.allowMessagesFrom === "followers") {
      const f = await db.select().from(follows).where(and(eq(follows.followerId, t.id), eq(follows.followingId, user.id)));
      if (!f.length) throw new ApiError(`${t.displayName} only accepts messages from people they follow`, 403);
    }
  }
  if (memberIds.length === 1) {
    const mine = await myConversationIds(user.id);
    if (mine.length) {
      const existing = await db
        .select({ id: conversations.id })
        .from(conversations)
        .innerJoin(conversationMembers, eq(conversationMembers.conversationId, conversations.id))
        .where(and(inArray(conversations.id, mine), eq(conversations.isGroup, false), eq(conversationMembers.userId, memberIds[0])));
      if (existing.length) return json({ id: existing[0].id, existing: true });
    }
  }
  const id = await db.transaction(async (tx) => {
    const [c] = await tx.insert(conversations).values({ isGroup: memberIds.length > 1, name: memberIds.length > 1 ? body.name ?? null : null }).returning();
    await tx.insert(conversationMembers).values([user.id, ...memberIds].map((userId) => ({ conversationId: c.id, userId })));
    return c.id;
  });
  return json({ id }, { status: 201 });
});
