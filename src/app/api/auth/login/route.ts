import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { createSession, publicUser, verifyPassword } from "@/lib/auth";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { loginSchema } from "@/lib/validations";

export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  rateLimit(`auth:${ip}`, LIMITS.auth);
  const body = loginSchema.parse(await req.json());
  if (body.website) throw new ApiError("Bot check failed");
  const [u] = await db.select().from(users).where(eq(users.email, body.email.toLowerCase()));
  if (!u || !(await verifyPassword(body.password, u.passwordHash))) throw new ApiError("Incorrect email or password", 401);
  if (u.deletionRequestedAt) await db.update(users).set({ deletionRequestedAt: null }).where(eq(users.id, u.id)); // logging in cancels deletion
  await createSession(u.id);
  return json({ user: publicUser(u), onboarded: u.onboarded });
});
