import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getVisiblePost } from "@/lib/feed";

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  const post = await getVisiblePost(id, user.id);
  if (!post) throw new ApiError("Post not found", 404);
  const existing = await db.select().from(bookmarks).where(and(eq(bookmarks.userId, user.id), eq(bookmarks.postId, id)));
  if (existing.length) {
    await db.delete(bookmarks).where(and(eq(bookmarks.userId, user.id), eq(bookmarks.postId, id)));
    return json({ bookmarked: false });
  }
  await db.insert(bookmarks).values({ userId: user.id, postId: id }).onConflictDoNothing();
  return json({ bookmarked: true });
});
