import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversationMembers } from "@/db/schema";
import { handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { setTyping } from "@/lib/chat";
export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireUser();
  const [m] = await db.select().from(conversationMembers).where(and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, user.id)));
  if (m) setTyping(id, user.id);
  return json({ ok: true });
});
