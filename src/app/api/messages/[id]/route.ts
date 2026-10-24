import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { conversationMembers, conversations, messages, users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { messagesSince, typingUsers } from "@/lib/chat";
import { isBlockedEitherWay } from "@/lib/permissions";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { messageSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

async function requireMembership(conversationId: string, userId: string) {
  const [m] = await db.select().from(conversationMembers).where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)));
  if (!m) throw new ApiError("Conversation not found", 404);
  return m;
}

export const GET = handler(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await requireUser();
  await requireMembership(id, user.id);
  const since = new URL(req.url).searchParams.get("since");
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  const members = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl, lastActiveAt: users.lastActiveAt, lastReadAt: conversationMembers.lastReadAt })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(eq(conversationMembers.conversationId, id));
  const list = await messagesSince(id, since ? new Date(since) : null);
  const blockedIds: string[] = [];
  for (const m of members) if (m.id !== user.id && (await isBlockedEitherWay(user.id, m.id))) blockedIds.push(m.id);
  return json({ conversation: conv, members, messages: list, typing: typingUsers(id, user.id), blockedIds });
});

export const POST = handler(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  rateLimit(`msg:${user.id}`, LIMITS.message);
  await requireMembership(id, user.id);
  const body = messageSchema.parse(await req.json());
  if (!body.text.trim() && !body.imageUrl) throw new ApiError("Empty message");
  // Users who blocked each other mid-conversation cannot keep messaging
  const others = await db.select({ userId: conversationMembers.userId }).from(conversationMembers).where(eq(conversationMembers.conversationId, id));
  for (const o of others) if (o.userId !== user.id && (await isBlockedEitherWay(user.id, o.userId))) throw new ApiError("You can't message this conversation", 403);
  // Idempotent retry: same clientId returns the existing message (offline queue support)
  if (body.clientId) {
    const [dup] = await db.select().from(messages).where(and(eq(messages.conversationId, id), eq(messages.senderId, user.id), eq(messages.clientId, body.clientId)));
    if (dup) return json({ message: { ...dup, reactions: [] } });
  }
  const [m] = await db.insert(messages).values({ conversationId: id, senderId: user.id, text: body.text.trim(), imageUrl: body.imageUrl ?? null, clientId: body.clientId ?? null }).returning();
  await db.update(conversations).set({ lastMessageAt: m.createdAt }).where(eq(conversations.id, id));
  await db.update(conversationMembers).set({ lastReadAt: m.createdAt }).where(and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, user.id)));
  return json({ message: { ...m, reactions: [] } }, { status: 201 });
});

/** Leave a conversation. */
export const DELETE = handler(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  await db.delete(conversationMembers).where(and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, user.id)));
  void inArray;
  return json({ ok: true });
});
