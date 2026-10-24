import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversationMembers } from "@/db/schema";
import { handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireUser();
  await db.update(conversationMembers).set({ lastReadAt: new Date() }).where(and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, user.id)));
  return json({ ok: true });
});
