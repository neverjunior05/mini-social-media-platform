import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { createSession, hashPassword, publicUser } from "@/lib/auth";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { registerSchema } from "@/lib/validations";
import { RESERVED_USERNAMES } from "@/lib/utils";
import { media } from "@/config/media";

export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  rateLimit(`auth:${ip}`, LIMITS.auth);
  const body = registerSchema.parse(await req.json());
  if (body.website) throw new ApiError("Bot check failed");
  const username = body.username.toLowerCase();
  if (RESERVED_USERNAMES.has(username)) throw new ApiError("That username is reserved");
  const exists = await db.select({ id: users.id }).from(users).where(or(eq(users.email, body.email.toLowerCase()), eq(users.username, username)));
  if (exists.length) throw new ApiError("Email or username already in use");
  const [u] = await db
    .insert(users)
    .values({ email: body.email.toLowerCase(), passwordHash: await hashPassword(body.password), username, displayName: body.displayName.trim(), avatarUrl: media.avatars.dicebear("notionists", username) })
    .returning();
  // Mock email verification: logged to the server console instead of sent.
  console.log(`[mail] Verify your Pebble account: http://localhost:3000/api/auth/verify?token=demo-${u.id}`);
  await createSession(u.id);
  return json({ user: publicUser(u) }, { status: 201 });
});
