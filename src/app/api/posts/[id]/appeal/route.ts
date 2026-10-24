import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appeals, posts } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  const { text } = z.object({ text: z.string().min(5).max(1000) }).parse(await req.json());
  const [p] = await db.select().from(posts).where(eq(posts.id, id));
  if (!p || p.authorId !== user.id || !p.removedReason) throw new ApiError("Nothing to appeal", 400);
  await db.insert(appeals).values({ userId: user.id, postId: id, text });
  return json({ ok: true }, { status: 201 });
});
