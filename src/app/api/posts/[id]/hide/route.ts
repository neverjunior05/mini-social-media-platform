import { db } from "@/db";
import { hiddenPosts } from "@/db/schema";
import { handler, json, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  await db.insert(hiddenPosts).values({ userId: user.id, postId: id }).onConflictDoNothing();
  return json({ ok: true });
});
