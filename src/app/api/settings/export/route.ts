import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks, comments, follows, messages, posts, reactions, stories } from "@/db/schema";
import { handler } from "@/lib/api";
import { requireUser, publicUser } from "@/lib/auth";

/** GDPR-style export: JSON download of your own data only. */
export const GET = handler(async () => {
  const u = await requireUser();
  const data = {
    exportedAt: new Date().toISOString(),
    profile: { ...publicUser(u), email: u.email, interests: u.interests },
    posts: await db.select().from(posts).where(eq(posts.authorId, u.id)),
    comments: await db.select().from(comments).where(eq(comments.authorId, u.id)),
    reactions: await db.select().from(reactions).where(eq(reactions.userId, u.id)),
    bookmarks: await db.select().from(bookmarks).where(eq(bookmarks.userId, u.id)),
    stories: await db.select().from(stories).where(eq(stories.authorId, u.id)),
    follows: await db.select().from(follows).where(or(eq(follows.followerId, u.id), eq(follows.followingId, u.id))),
    messagesSent: await db.select().from(messages).where(eq(messages.senderId, u.id)),
  };
  return new Response(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="pebble-export-${u.username}.json"` } });
});
