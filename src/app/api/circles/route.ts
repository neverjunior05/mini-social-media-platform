import { eq } from "drizzle-orm";
import { db } from "@/db";
import { circleMembers, circles } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { circleSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const body = circleSchema.parse(await req.json());
  const base = slugify(body.name) || "circle";
  let slug = base;
  for (let i = 2; (await db.select({ id: circles.id }).from(circles).where(eq(circles.slug, slug))).length; i++) slug = `${base}-${i}`;
  if (!slug) throw new ApiError("Invalid name");
  const [c] = await db.transaction(async (tx) => {
    const [c] = await tx.insert(circles).values({ slug, name: body.name.trim(), description: body.description, rules: body.rules, coverUrl: body.coverUrl || null, isPrivate: body.isPrivate, createdBy: user.id }).returning();
    await tx.insert(circleMembers).values({ circleId: c.id, userId: user.id, role: "owner" });
    return [c];
  });
  return json({ circle: c }, { status: 201 });
});
