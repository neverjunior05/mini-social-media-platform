import { eq } from "drizzle-orm";
import { db } from "@/db";
import { circles, posts } from "@/db/schema";
import { handler, json, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { postList } from "@/lib/feed";
import { canViewCircle } from "@/lib/permissions";

export const GET = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const user = await getCurrentUser();
  const [c] = await db.select().from(circles).where(eq(circles.slug, slug));
  if (!c) throw new ApiError("Circle not found", 404);
  if (!(await canViewCircle(user?.id ?? null, c))) return json({ items: [], nextCursor: null, private: true });
  return json(await postList({ viewerId: user?.id ?? null, cursor: new URL(req.url).searchParams.get("cursor"), where: [eq(posts.circleId, c.id)] }));
});
