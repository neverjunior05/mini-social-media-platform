import { and, eq, exists, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, postMedia, posts, reactions, users } from "@/db/schema";
import { handler, json, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { hydratePosts, postList } from "@/lib/feed";
import { canViewProfileContent, isBlockedEitherWay } from "@/lib/permissions";

/** Profile tabs: posts | replies | media | likes. Private accounts enforce follower-only access. */
export const GET = handler(async (req: Request, { params }: { params: Promise<{ username: string }> }) => {
  const { username } = await params;
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "posts";
  const cursor = url.searchParams.get("cursor");
  const viewer = await getCurrentUser();
  const [target] = await db.select().from(users).where(eq(users.username, username));
  if (!target) throw new ApiError("User not found", 404);
  if (viewer && (await isBlockedEitherWay(viewer.id, target.id))) return json({ items: [], nextCursor: null, blocked: true });
  if (!(await canViewProfileContent(viewer, target))) return json({ items: [], nextCursor: null, private: true });
  const viewerId = viewer?.id ?? null;
  if (tab === "replies") {
    const rows = await db.select({ postId: comments.postId }).from(comments).where(and(eq(comments.authorId, target.id), isNull(comments.deletedAt))).limit(60);
    const ids = [...new Set(rows.map((r) => r.postId))];
    const r = await postList({ viewerId, cursor, where: [inArray(posts.id, ids.length ? ids : ["-"])] });
    return json(r);
  }
  if (tab === "media") {
    return json(await postList({ viewerId, cursor, where: [eq(posts.authorId, target.id), exists(db.select({ x: sql`1` }).from(postMedia).where(eq(postMedia.postId, posts.id)))] }));
  }
  if (tab === "likes") {
    if (viewerId !== target.id && viewer?.role === "member") return json({ items: [], nextCursor: null, hidden: true });
    const rows = await db.select({ postId: reactions.postId }).from(reactions).where(eq(reactions.userId, target.id)).limit(60);
    const items = await hydratePosts(rows.map((r) => r.postId), viewerId);
    return json({ items: items.filter((p) => !p.deletedAt), nextCursor: null });
  }
  const r = await postList({ viewerId, cursor, where: [eq(posts.authorId, target.id)], includeDeleted: viewerId === target.id });
  void isNotNull;
  return json(r);
});
