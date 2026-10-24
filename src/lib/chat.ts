import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversationMembers, conversations, messageReactions, messages, users } from "@/db/schema";

/** In-memory typing indicators (userId -> conversationId -> timestamp). Fine for a single node. */
const typing = new Map<string, Map<string, number>>();
export function setTyping(conversationId: string, userId: string) {
  const m = typing.get(conversationId) ?? new Map();
  m.set(userId, Date.now());
  typing.set(conversationId, m);
}
export function typingUsers(conversationId: string, exclude: string) {
  const m = typing.get(conversationId);
  if (!m) return [];
  const now = Date.now();
  return [...m.entries()].filter(([id, t]) => id !== exclude && now - t < 4000).map(([id]) => id);
}

export async function myConversationIds(userId: string) {
  const rows = await db.select({ id: conversationMembers.conversationId }).from(conversationMembers).where(eq(conversationMembers.userId, userId));
  return rows.map((r) => r.id);
}

export async function unreadMessageCount(userId: string) {
  const [r] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversationMembers, and(eq(conversationMembers.conversationId, messages.conversationId), eq(conversationMembers.userId, userId)))
    .where(and(gt(messages.createdAt, conversationMembers.lastReadAt), sql`${messages.senderId} <> ${userId}`));
  return r?.c ?? 0;
}

export type MessageDto = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  clientId: string | null;
  createdAt: Date;
  reactions: { userId: string; emoji: string }[];
};

export async function messagesSince(conversationId: string, since: Date | null, limit = 60): Promise<MessageDto[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), since ? gt(messages.createdAt, since) : undefined))
    .orderBy(sql`${messages.createdAt} desc`)
    .limit(limit);
  const ids = rows.map((r) => r.id);
  const reacts = ids.length ? await db.select().from(messageReactions).where(inArray(messageReactions.messageId, ids)) : [];
  return rows.reverse().map((m) => ({ ...m, reactions: reacts.filter((r) => r.messageId === m.id).map((r) => ({ userId: r.userId, emoji: r.emoji })) }));
}

export async function conversationSummaries(userId: string) {
  const ids = await myConversationIds(userId);
  if (!ids.length) return [];
  const convs = await db.select().from(conversations).where(inArray(conversations.id, ids)).orderBy(sql`${conversations.lastMessageAt} desc`);
  const members = await db
    .select({ conversationId: conversationMembers.conversationId, lastReadAt: conversationMembers.lastReadAt, u: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl, lastActiveAt: users.lastActiveAt } })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(inArray(conversationMembers.conversationId, ids));
  const last = await db
    .select({ conversationId: messages.conversationId, text: messages.text, imageUrl: messages.imageUrl, senderId: messages.senderId, createdAt: messages.createdAt })
    .from(messages)
    .where(inArray(messages.conversationId, ids))
    .orderBy(sql`${messages.createdAt} desc`);
  const unread = await db
    .select({ conversationId: messages.conversationId, c: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversationMembers, and(eq(conversationMembers.conversationId, messages.conversationId), eq(conversationMembers.userId, userId)))
    .where(and(inArray(messages.conversationId, ids), gt(messages.createdAt, conversationMembers.lastReadAt), sql`${messages.senderId} <> ${userId}`))
    .groupBy(messages.conversationId);
  return convs.map((c) => ({
    id: c.id,
    isGroup: c.isGroup,
    name: c.name,
    lastMessageAt: c.lastMessageAt,
    members: members.filter((m) => m.conversationId === c.id).map((m) => ({ ...m.u, lastReadAt: m.lastReadAt })),
    lastMessage: last.find((l) => l.conversationId === c.id) ?? null,
    unread: unread.find((u) => u.conversationId === c.id)?.c ?? 0,
  }));
}
