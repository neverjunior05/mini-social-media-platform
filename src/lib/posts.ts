import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { mentions, pollOptions, polls, postHashtags, postMedia, posts, users, type User, follows } from "@/db/schema";
import { ApiError } from "./api";
import { fetchLinkPreview } from "./linkPreview";
import { notify } from "./notifications";
import { LIMITS, rateLimit } from "./rateLimit";
import { extractUrls, fingerprint, parseHashtags, parseMentions } from "./utils";
import type { postSchema } from "./validations";
import type { z } from "zod";
import { canViewCircle } from "./permissions";
import { circles, circleMembers } from "@/db/schema";

type PostInput = z.infer<typeof postSchema>;

/** Creates a post (text/media/poll/repost/quote), with spam controls, hashtags, mentions and link preview. */
export async function createPost(user: User, input: PostInput) {
  rateLimit(`post:${user.id}`, LIMITS.post);
  const isNew = Date.now() - new Date(user.createdAt).getTime() < 86_400_000;
  if (isNew) rateLimit(`newpost:${user.id}`, LIMITS.newAccountPost);
  const urls = extractUrls(input.text);
  if (urls.length > 2 || (isNew && urls.length > 1)) throw new ApiError("Too many links for one post");

  // Duplicate-content detection (same text in last 10 minutes)
  if (input.text.trim()) {
    const recent = await db
      .select({ text: posts.text })
      .from(posts)
      .where(and(eq(posts.authorId, user.id), gt(posts.createdAt, new Date(Date.now() - 600_000))));
    if (recent.some((r) => fingerprint(r.text) === fingerprint(input.text))) throw new ApiError("You just posted that — give it a minute.");
  }

  if (input.circleId) {
    const [c] = await db.select().from(circles).where(eq(circles.id, input.circleId));
    if (!c) throw new ApiError("Circle not found", 404);
    const [m] = await db.select().from(circleMembers).where(and(eq(circleMembers.circleId, c.id), eq(circleMembers.userId, user.id), eq(circleMembers.status, "active")));
    if (!m || !(await canViewCircle(user.id, c))) throw new ApiError("Join the circle to post in it", 403);
  }
  if (input.repostOfId) {
    const [orig] = await db.select().from(posts).where(eq(posts.id, input.repostOfId));
    if (!orig || orig.deletedAt) throw new ApiError("That post is no longer available", 404);
    const [author] = await db.select({ isPrivate: users.isPrivate }).from(users).where(eq(users.id, orig.authorId));
    if (author?.isPrivate) throw new ApiError("Posts from private accounts can't be reposted", 403);
    if (orig.circleId) throw new ApiError("Circle posts can't be reposted outside the circle", 403);
    if (!input.text.trim()) {
      // plain repost: idempotent — toggle off if exists
      const existing = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.authorId, user.id), eq(posts.repostOfId, orig.id), eq(posts.text, "")));
      if (existing.length) {
        await db.delete(posts).where(eq(posts.id, existing[0].id));
        return { toggledOff: true, id: existing[0].id };
      }
    }
  }
  const linkPreview = urls[0] && !input.media.length ? await fetchLinkPreview(urls[0]) : null;
  const scheduled = input.scheduledAt ? new Date(input.scheduledAt) : null;
  const published = !scheduled || scheduled <= new Date();

  const result = await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values({ authorId: user.id, text: input.text.trim(), circleId: input.circleId ?? null, repostOfId: input.repostOfId ?? null, linkPreview, scheduledAt: scheduled, published })
      .returning();
    if (input.media.length) await tx.insert(postMedia).values(input.media.map((m, i) => ({ postId: post.id, url: m.url, alt: m.alt, order: i })));
    if (input.poll) {
      const [poll] = await tx.insert(polls).values({ postId: post.id, endsAt: new Date(Date.now() + input.poll.durationHours * 3_600_000) }).returning();
      await tx.insert(pollOptions).values(input.poll.options.map((text, i) => ({ pollId: poll.id, text, order: i })));
    }
    const tags = parseHashtags(input.text);
    if (tags.length) await tx.insert(postHashtags).values(tags.map((tag) => ({ postId: post.id, tag })));
    const handles = parseMentions(input.text);
    let mentioned: { id: string; allowMentionsFrom: string }[] = [];
    if (handles.length) {
      mentioned = await tx.select({ id: users.id, allowMentionsFrom: users.allowMentionsFrom }).from(users).where(inArray(users.username, handles));
      if (mentioned.length) await tx.insert(mentions).values(mentioned.map((m) => ({ postId: post.id, userId: m.id }))).onConflictDoNothing();
    }
    return { post, mentioned };
  });

  if (published) {
    for (const m of result.mentioned) {
      if (m.allowMentionsFrom === "nobody") continue;
      if (m.allowMentionsFrom === "followers") {
        const f = await db.select().from(follows).where(and(eq(follows.followerId, m.id), eq(follows.followingId, user.id)));
        if (!f.length) continue;
      }
      await notify({ userId: m.id, actorId: user.id, type: "mention", postId: result.post.id });
    }
    if (input.repostOfId) {
      const [orig] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, input.repostOfId));
      if (orig) await notify({ userId: orig.authorId, actorId: user.id, type: "repost", postId: input.repostOfId });
    }
  }
  return { id: result.post.id, toggledOff: false };
}
