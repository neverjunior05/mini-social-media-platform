import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handler, json, assertSameOrigin } from "@/lib/api";
import { requireUser, destroySession } from "@/lib/auth";
import { site } from "@/config/site";

/** Schedules deletion after a grace period; logging in again cancels it. */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requireUser();
  await db.update(users).set({ deletionRequestedAt: new Date() }).where(eq(users.id, u.id));
  await destroySession();
  return json({ ok: true, graceDays: site.deletionGraceDays });
});
export const DELETE = handler(async () => {
  const u = await requireUser();
  await db.update(users).set({ deletionRequestedAt: null }).where(eq(users.id, u.id));
  return json({ ok: true });
});
