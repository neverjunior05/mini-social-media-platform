import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { posts, reactions } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getVisiblePost } from "@/lib/feed";
import { notify } from "@/lib/notifications";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { reactionSchema } from "@/lib/validations";

/** Idempotent: setting the same type again is a no-op, null removes. One reaction per user per post. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  rateLimit(`react:${user.id}`, LIMITS.react);
  const { type } = reactionSchema.parse(await req.json());
  const post = await getVisiblePost(id, user.id);
  if (!post || post.deletedAt) throw new ApiError("Post not found", 404);
  await db.transaction(async (tx) => {
    await tx.delete(reactions).where(and(eq(reactions.postId, id), eq(reactions.userId, user.id)));
    if (type) await tx.insert(reactions).values({ postId: id, userId: user.id, type }).onConflictDoNothing();
  });
  if (type) {
    const [p] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, id));
    if (p) await notify({ userId: p.authorId, actorId: user.id, type: "reaction", postId: id, meta: { reaction: type } });
  }
  const fresh = await getVisiblePost(id, user.id);
  return json({ reactionCounts: fresh?.reactionCounts, reactionTotal: fresh?.reactionTotal, myReaction: fresh?.myReaction });
});
