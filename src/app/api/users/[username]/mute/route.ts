import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mutes, users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const POST = handler(async (req: Request, { params }: { params: Promise<{ username: string }> }) => {
  assertSameOrigin(req);
  const { username } = await params;
  const user = await requireUser();
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
  if (!target || target.id === user.id) throw new ApiError("User not found", 404);
  const existing = await db.select().from(mutes).where(and(eq(mutes.muterId, user.id), eq(mutes.mutedId, target.id)));
  if (existing.length) {
    await db.delete(mutes).where(and(eq(mutes.muterId, user.id), eq(mutes.mutedId, target.id)));
    return json({ muted: false });
  }
  await db.insert(mutes).values({ muterId: user.id, mutedId: target.id }).onConflictDoNothing();
  return json({ muted: true });
});
