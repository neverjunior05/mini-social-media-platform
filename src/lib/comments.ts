import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, users } from "@/db/schema";
import { hiddenUserIds } from "./permissions";

export type CommentDto = { id: string; text: string; parentId: string | null; createdAt: Date; deleted: boolean; author: { id: string; username: string; displayName: string; avatarUrl: string } };

/** All comments for a post (flat, chronological) minus blocked/muted authors. Client builds the 2-level tree. */
export async function listComments(postId: string, viewerId: string | null): Promise<CommentDto[]> {
  const hidden = await hiddenUserIds(viewerId);
  const rows = await db
    .select({ c: comments, u: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl } })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));
  return rows
    .filter((r) => !hidden.has(r.u.id))
    .map((r) => ({ id: r.c.id, text: r.c.deletedAt ? "" : r.c.text, parentId: r.c.parentId, createdAt: r.c.createdAt, deleted: !!r.c.deletedAt, author: r.u }));
}
