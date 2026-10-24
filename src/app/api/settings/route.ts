import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mutedWords, users } from "@/db/schema";
import { handler, json, assertSameOrigin } from "@/lib/api";
import { requireUser, publicUser } from "@/lib/auth";
import { settingsSchema } from "@/lib/validations";

export const GET = handler(async () => {
  const u = await requireUser();
  const words = await db.select({ w: mutedWords.word }).from(mutedWords).where(eq(mutedWords.userId, u.id));
  return json({ settings: { ...publicUser(u), email: u.email, allowMessagesFrom: u.allowMessagesFrom, allowMentionsFrom: u.allowMentionsFrom, notifPrefs: u.notifPrefs, reduceMotion: u.reduceMotion, soundEnabled: u.soundEnabled, takeABreak: u.takeABreak, interests: u.interests, deletionRequestedAt: u.deletionRequestedAt, mutedWords: words.map((x) => x.w) } });
});

export const PATCH = handler(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requireUser();
  const body = settingsSchema.parse(await req.json());
  const { mutedWords: words, ...fields } = body;
  const set: Record<string, unknown> = { ...fields };
  if (fields.link === "") set.link = null;
  if (fields.bannerUrl === "") set.bannerUrl = null;
  if (Object.keys(set).length) await db.update(users).set(set).where(eq(users.id, u.id));
  if (words) {
    await db.delete(mutedWords).where(eq(mutedWords.userId, u.id));
    if (words.length) await db.insert(mutedWords).values(words.map((word) => ({ userId: u.id, word: word.toLowerCase().trim() }))).onConflictDoNothing();
  }
  return json({ ok: true });
});
