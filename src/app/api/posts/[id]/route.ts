import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { posts, postHashtags, auditLogs } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { getVisiblePost, hydratePosts } from "@/lib/feed";
import { parseHashtags } from "@/lib/utils";
import { site } from "@/config/site";
import { z } from "zod";
import { notify } from "@/lib/notifications";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await getCurrentUser();
  const post = await getVisiblePost(id, user?.id ?? null);
  if (!post) throw new ApiError("Post not found", 404);
  return json({ post });
});

/** Edit within 15 minutes (author only). */
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  const { text } = z.object({ text: z.string().min(1).max(site.postMaxLength) }).parse(await req.json());
  const [p] = await db.select().from(posts).where(eq(posts.id, id));
  if (!p || p.deletedAt) throw new ApiError("Post not found", 404);
  if (p.authorId !== user.id) throw new ApiError("Not your post", 403);
  if (Date.now() - p.createdAt.getTime() > site.editWindowMinutes * 60_000) throw new ApiError(`Posts can only be edited within ${site.editWindowMinutes} minutes`);
  await db.transaction(async (tx) => {
    await tx.update(posts).set({ text: text.trim(), editedAt: new Date() }).where(eq(posts.id, id));
    await tx.delete(postHashtags).where(eq(postHashtags.postId, id));
    const tags = parseHashtags(text);
    if (tags.length) await tx.insert(postHashtags).values(tags.map((tag) => ({ postId: id, tag })));
  });
  const [post] = await hydratePosts([id], user.id);
  return json({ post });
});

/** Delete anytime (author) or remove with a reason (moderator/admin — the author sees why). */
export const DELETE = handler(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  const [p] = await db.select().from(posts).where(eq(posts.id, id));
  if (!p) throw new ApiError("Post not found", 404);
  const isStaff = user.role === "moderator" || user.role === "admin";
  if (p.authorId !== user.id && !isStaff) throw new ApiError("Not allowed", 403);
  const reason = isStaff && p.authorId !== user.id ? (new URL(req.url).searchParams.get("reason") ?? "Removed by moderators for violating community guidelines.") : null;
  await db.update(posts).set({ deletedAt: new Date(), removedReason: reason }).where(and(eq(posts.id, id)));
  if (reason) {
    await db.insert(auditLogs).values({ actorId: user.id, action: "post.remove", targetType: "post", targetId: id, meta: { reason } });
    await notify({ userId: p.authorId, actorId: null, type: "moderation", postId: id, meta: { message: `One of your posts was removed: ${reason} You can appeal from the post.` } });
  }
  return json({ ok: true });
});
