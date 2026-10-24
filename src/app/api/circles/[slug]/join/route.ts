import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { circleMembers, circles } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

type Ctx = { params: Promise<{ slug: string }> };

/** Join / leave (public) or request / cancel (private). Owners can't leave. */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  const { slug } = await params;
  const user = await requireUser();
  const [c] = await db.select().from(circles).where(eq(circles.slug, slug));
  if (!c) throw new ApiError("Circle not found", 404);
  const [m] = await db.select().from(circleMembers).where(and(eq(circleMembers.circleId, c.id), eq(circleMembers.userId, user.id)));
  if (m) {
    if (m.role === "owner") throw new ApiError("Owners can't leave their circle");
    await db.delete(circleMembers).where(and(eq(circleMembers.circleId, c.id), eq(circleMembers.userId, user.id)));
    return json({ state: "none" });
  }
  await db.insert(circleMembers).values({ circleId: c.id, userId: user.id, status: c.isPrivate ? "pending" : "active" }).onConflictDoNothing();
  return json({ state: c.isPrivate ? "pending" : "member" });
});

/** Moderators approve/decline pending members or promote. */
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  assertSameOrigin(req);
  const { slug } = await params;
  const user = await requireUser();
  const { userId, action } = z.object({ userId: z.string(), action: z.enum(["approve", "decline", "promote", "remove"]) }).parse(await req.json());
  const [c] = await db.select().from(circles).where(eq(circles.slug, slug));
  if (!c) throw new ApiError("Circle not found", 404);
  const [me] = await db.select().from(circleMembers).where(and(eq(circleMembers.circleId, c.id), eq(circleMembers.userId, user.id)));
  if (!me || me.role === "member") throw new ApiError("Moderators only", 403);
  const where = and(eq(circleMembers.circleId, c.id), eq(circleMembers.userId, userId));
  if (action === "approve") await db.update(circleMembers).set({ status: "active" }).where(where);
  if (action === "decline" || action === "remove") await db.delete(circleMembers).where(where);
  if (action === "promote") await db.update(circleMembers).set({ role: "moderator" }).where(where);
  return json({ ok: true });
});
