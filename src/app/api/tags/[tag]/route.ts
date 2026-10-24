import { exists, sql } from "drizzle-orm";
import { db } from "@/db";
import { postHashtags, posts } from "@/db/schema";
import { handler, json } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { postList } from "@/lib/feed";
export const GET = handler(async (req: Request, { params }: { params: Promise<{ tag: string }> }) => {
  const { tag: raw } = await params;
  const tag = decodeURIComponent(raw).toLowerCase();
  const user = await getCurrentUser();
  return json(await postList({ viewerId: user?.id ?? null, cursor: new URL(req.url).searchParams.get("cursor"), where: [exists(db.select({ x: sql`1` }).from(postHashtags).where(sql`${postHashtags.postId} = ${posts.id} and ${postHashtags.tag} = ${tag}`))] }));
});
