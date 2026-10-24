import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stories, storyViews, users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";

type Ctx = { params: Promise<{ id: string }> };

/** Marks a story as viewed (idempotent). Expired stories still open in a viewer return 410. */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  const [s] = await db.select().from(stories).where(eq(stories.id, id));
  if (!s) throw new ApiError("Story not found", 404);
  if (s.expired || s.expiresAt < new Date()) return json({ expired: true }, { status: 410 });
  if (s.authorId !== user.id) {
    const r = await db.insert(storyViews).values({ storyId: id, viewerId: user.id }).onConflictDoNothing().returning();
    if (r.length) await notify({ userId: s.authorId, actorId: user.id, type: "story_view" });
  }
  return json({ ok: true });
});

/** Viewer list — author only. */
export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await requireUser();
  const [s] = await db.select().from(stories).where(eq(stories.id, id));
  if (!s || s.authorId !== user.id) throw new ApiError("Not allowed", 403);
  const viewers = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl, at: storyViews.createdAt })
    .from(storyViews)
    .innerJoin(users, eq(users.id, storyViews.viewerId))
    .where(eq(storyViews.storyId, id));
  return json({ viewers });
});
