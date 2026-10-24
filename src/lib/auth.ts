import { cookies } from "next/headers";
import { cache } from "react";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";

export const SESSION_COOKIE = "pebble_session";
const SESSION_DAYS = 30;

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

/** Creates a DB-backed session and sets the httpOnly cookie. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  jar.delete(SESSION_COOKIE);
}

/** Current user from the cookie (cached per request). Returns null for guests, expired or suspended-deleted users. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const user = rows[0]?.user ?? null;
  if (user) {
    // Touch presence (fire-and-forget; at most once per minute per request)
    if (Date.now() - new Date(user.lastActiveAt).getTime() > 60_000) {
      db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, user.id)).catch(() => {});
    }
  }
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Please sign in", 401);
  if (user.suspendedUntil && user.suspendedUntil > new Date()) throw new AuthError("Your account is suspended until " + user.suspendedUntil.toLocaleDateString(), 403);
  return user;
}

export async function requireRole(roles: Array<"moderator" | "admin">) {
  const user = await requireUser();
  if (!roles.includes(user.role as "moderator" | "admin")) throw new AuthError("Not allowed", 403);
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Public, client-safe shape of a user. Never leak email/password hash. */
export function publicUser(u: User) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    bannerUrl: u.bannerUrl,
    bio: u.bio,
    link: u.link,
    role: u.role,
    isPrivate: u.isPrivate,
    accentColor: u.accentColor,
    createdAt: u.createdAt,
    lastActiveAt: u.lastActiveAt,
    suspended: !!(u.suspendedUntil && u.suspendedUntil > new Date()),
  };
}
export type PublicUser = ReturnType<typeof publicUser>;
