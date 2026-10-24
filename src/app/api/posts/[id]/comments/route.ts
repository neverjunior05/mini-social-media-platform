import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { comments, posts, users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { getVisiblePost } from "@/lib/feed";
import { notify } from "@/lib/notifications";
import { listComments } from "@/lib/comments";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { commentSchema } from "@/lib/validations";
import { parseMentions } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await getCurrentUser();
  const post = await getVisiblePost(id, user?.id ?? null);
  if (!post) throw new ApiError("Post not found", 404);
  return json({ comments: await listComments(id, user?.id ?? null) });
});

export const POST = handler(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  rateLimit(`comment:${user.id}`, LIMITS.comment);
  const body = commentSchema.parse(await req.json());
  const post = await getVisiblePost(id, user.id);
  if (!post || post.deletedAt) throw new ApiError("Post not found", 404);
  let parentId: string | null = null;
  if (body.parentId) {
    const [parent] = await db.select().from(comments).where(and(eq(comments.id, body.parentId), eq(comments.postId, id), isNull(comments.deletedAt)));
    if (!parent) throw new ApiError("Parent comment not found", 404);
    // Max 2 levels of nesting: replies to a reply attach to the top-level parent
    parentId = parent.parentId ?? parent.id;
  }
  const [c] = await db.insert(comments).values({ postId: id, authorId: user.id, parentId, text: body.text.trim() }).returning();
  const [p] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, id));
  if (p) await notify({ userId: p.authorId, actorId: user.id, type: "comment", postId: id, commentId: c.id });
  if (parentId) {
    const [parent] = await db.select({ authorId: comments.authorId }).from(comments).where(eq(comments.id, parentId));
    if (parent && parent.authorId !== p?.authorId) await notify({ userId: parent.authorId, actorId: user.id, type: "comment", postId: id, commentId: c.id });
  }
  const handles = parseMentions(body.text);
  if (handles.length) {
    const m = await db.select({ id: users.id }).from(users).where(inArray(users.username, handles));
    for (const x of m) await notify({ userId: x.id, actorId: user.id, type: "mention", postId: id, commentId: c.id });
  }
  return json({ comment: { id: c.id, text: c.text, parentId: c.parentId, createdAt: c.createdAt, deleted: false, author: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl } } }, { status: 201 });
});

export const DELETE = handler(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  const commentId = new URL(req.url).searchParams.get("commentId");
  if (!commentId) throw new ApiError("commentId required");
  const [c] = await db.select().from(comments).where(and(eq(comments.id, commentId), eq(comments.postId, id)));
  if (!c) throw new ApiError("Not found", 404);
  const isStaff = user.role !== "member";
  if (c.authorId !== user.id && !isStaff) throw new ApiError("Not allowed", 403);
  await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, commentId));
  return json({ ok: true });
});
