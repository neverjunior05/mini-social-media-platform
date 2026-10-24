import { db } from "@/db";
import { reports } from "@/db/schema";
import { handler, json, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { reportSchema } from "@/lib/validations";
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  rateLimit(`report:${user.id}`, LIMITS.report);
  const body = reportSchema.parse(await req.json());
  await db.insert(reports).values({ reporterId: user.id, ...body });
  return json({ ok: true }, { status: 201 });
});
