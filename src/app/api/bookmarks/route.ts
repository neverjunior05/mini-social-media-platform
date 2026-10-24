import { eq, exists, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks, posts } from "@/db/schema";
import { handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { postList } from "@/lib/feed";
export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  return json(await postList({ viewerId: user.id, cursor: new URL(req.url).searchParams.get("cursor"), where: [exists(db.select({ x: sql`1` }).from(bookmarks).where(sql`${bookmarks.postId} = ${posts.id} and ${bookmarks.userId} = ${user.id}`))] }));
  void eq;
});
