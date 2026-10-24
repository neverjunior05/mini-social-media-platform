import { and, desc, eq, inArray, isNull, lt, notInArray, sql, gt } from "drizzle-orm";
import { db } from "@/db";
import {
  bookmarks,
  circles,
  comments,
  follows,
  hiddenPosts,
  pollOptions,
  pollVotes,
  polls,
  postHashtags,
  postMedia,
  posts,
  reactions,
  users,
  type ReactionType,
  type LinkPreview,
} from "@/db/schema";
import { visibilityFilters } from "./permissions";
import { containsMutedWord, decodeCursor, encodeCursor } from "./utils";

export type FeedAuthor = { id: string; username: string; displayName: string; avatarUrl: string; isPrivate: boolean; role: string; lastActiveAt: Date };
export type FeedPoll = {
  id: string;
  endsAt: Date;
  closed: boolean;
  totalVotes: number;
  myVote: string | null;
  options: { id: string; text: string; votes: number }[];
};
export type FeedPost = {
  id: string;
  text: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  removedReason: string | null;
  author: FeedAuthor;
  circle: { id: string; slug: string; name: string; isPrivate: boolean } | null;
  media: { id: string; url: string; alt: string }[];
  poll: FeedPoll | null;
  linkPreview: LinkPreview | null;
  hashtags: string[];
  reactionCounts: Record<ReactionType, number>;
  reactionTotal: number;
  myReaction: ReactionType | null;
  commentCount: number;
  repostCount: number;
  bookmarked: boolean;
  repostOf: FeedPost | null;
  isRepost: boolean;
  discoverReason?: string;
};

const EMPTY_COUNTS: Record<ReactionType, number> = { love: 0, laugh: 0, wow: 0, hug: 0, fire: 0, clap: 0 };

/** Loads full post objects (author, media, poll, counts, viewer state) for a list of IDs, preserving order. */
export async function hydratePosts(ids: string[], viewerId: string | null, depth = 0): Promise<FeedPost[]> {
  if (!ids.length) return [];
  const rows = await db.select().from(posts).where(inArray(posts.id, ids));
  const authorIds = [...new Set(rows.map((r) => r.authorId))];
  const circleIds = [...new Set(rows.map((r) => r.circleId).filter((x): x is string => !!x))];
  const repostIds = depth === 0 ? [...new Set(rows.map((r) => r.repostOfId).filter((x): x is string => !!x))] : [];

  const [authors, media, pollRows, tagRows, reactionAgg, commentAgg, repostAgg, myReacts, myBookmarks, circleRows, reposted] = await Promise.all([
    db.select().from(users).where(inArray(users.id, authorIds)),
    db.select().from(postMedia).where(inArray(postMedia.postId, ids)).orderBy(postMedia.order),
    db.select().from(polls).where(inArray(polls.postId, ids)),
    db.select().from(postHashtags).where(inArray(postHashtags.postId, ids)),
    db
      .select({ postId: reactions.postId, type: reactions.type, c: sql<number>`count(*)::int` })
      .from(reactions)
      .where(inArray(reactions.postId, ids))
      .groupBy(reactions.postId, reactions.type),
    db
      .select({ postId: comments.postId, c: sql<number>`count(*)::int` })
      .from(comments)
      .where(and(inArray(comments.postId, ids), isNull(comments.deletedAt)))
      .groupBy(comments.postId),
    db
      .select({ postId: posts.repostOfId, c: sql<number>`count(*)::int` })
      .from(posts)
      .where(and(inArray(posts.repostOfId, ids), isNull(posts.deletedAt)))
      .groupBy(posts.repostOfId),
    viewerId ? db.select().from(reactions).where(and(inArray(reactions.postId, ids), eq(reactions.userId, viewerId))) : Promise.resolve([]),
    viewerId ? db.select().from(bookmarks).where(and(inArray(bookmarks.postId, ids), eq(bookmarks.userId, viewerId))) : Promise.resolve([]),
    circleIds.length ? db.select().from(circles).where(inArray(circles.id, circleIds)) : Promise.resolve([]),
    repostIds.length ? hydratePosts(repostIds, viewerId, 1) : Promise.resolve([] as FeedPost[]),
  ]);

  // Polls: options + counts + my vote
  const pollIds = pollRows.map((p) => p.id);
  const [optionRows, voteAgg, myVotes] = pollIds.length
    ? await Promise.all([
        db.select().from(pollOptions).where(inArray(pollOptions.pollId, pollIds)).orderBy(pollOptions.order),
        db
          .select({ optionId: pollVotes.optionId, c: sql<number>`count(*)::int` })
          .from(pollVotes)
          .where(inArray(pollVotes.pollId, pollIds))
          .groupBy(pollVotes.optionId),
        viewerId ? db.select().from(pollVotes).where(and(inArray(pollVotes.pollId, pollIds), eq(pollVotes.userId, viewerId))) : Promise.resolve([]),
      ])
    : [[], [], []];

  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const circleMap = new Map(circleRows.map((c) => [c.id, c]));
  const repostMap = new Map(reposted.map((p) => [p.id, p]));
  const voteCount = new Map(voteAgg.map((v) => [v.optionId, v.c]));
  const myVoteMap = new Map(myVotes.map((v) => [v.pollId, v.optionId]));

  const byId = new Map<string, FeedPost>();
  for (const r of rows) {
    const a = authorMap.get(r.authorId);
    if (!a) continue;
    const counts = { ...EMPTY_COUNTS };
    for (const ra of reactionAgg.filter((x) => x.postId === r.id)) counts[ra.type] = ra.c;
    const poll = pollRows.find((p) => p.postId === r.id);
    const opts = poll ? optionRows.filter((o) => o.pollId === poll.id) : [];
    const totalVotes = opts.reduce((s, o) => s + (voteCount.get(o.id) ?? 0), 0);
    const circle = r.circleId ? circleMap.get(r.circleId) : null;
    const isDeleted = !!r.deletedAt;
    byId.set(r.id, {
      id: r.id,
      text: isDeleted ? "" : r.text,
      createdAt: r.createdAt,
      editedAt: r.editedAt,
      deletedAt: r.deletedAt,
      removedReason: r.removedReason,
      author: { id: a.id, username: a.username, displayName: a.displayName, avatarUrl: a.avatarUrl, isPrivate: a.isPrivate, role: a.role, lastActiveAt: a.lastActiveAt },
      circle: circle ? { id: circle.id, slug: circle.slug, name: circle.name, isPrivate: circle.isPrivate } : null,
      media: isDeleted ? [] : media.filter((m) => m.postId === r.id).map((m) => ({ id: m.id, url: m.url, alt: m.alt })),
      poll:
        poll && !isDeleted
          ? {
              id: poll.id,
              endsAt: poll.endsAt,
              closed: poll.closed || poll.endsAt < new Date(),
              totalVotes,
              myVote: myVoteMap.get(poll.id) ?? null,
              options: opts.map((o) => ({ id: o.id, text: o.text, votes: voteCount.get(o.id) ?? 0 })),
            }
          : null,
      linkPreview: isDeleted ? null : (r.linkPreview ?? null),
      hashtags: tagRows.filter((t) => t.postId === r.id).map((t) => t.tag),
      reactionCounts: counts,
      reactionTotal: Object.values(counts).reduce((s, n) => s + n, 0),
      myReaction: (myReacts.find((x) => x.postId === r.id)?.type as ReactionType | undefined) ?? null,
      commentCount: commentAgg.find((c) => c.postId === r.id)?.c ?? 0,
      repostCount: repostAgg.find((c) => c.postId === r.id)?.c ?? 0,
      bookmarked: myBookmarks.some((b) => b.postId === r.id),
      repostOf: r.repostOfId ? (repostMap.get(r.repostOfId) ?? null) : null,
      isRepost: !!r.repostOfId && r.text.trim() === "" && !isDeleted,
    });
  }
  return ids.map((id) => byId.get(id)).filter((p): p is FeedPost => !!p);
}

type Cursor = { t: string; id: string };
const PAGE = 15;

/** Base conditions shared by every feed: published, not deleted, visibility-safe. */
async function baseWhere(viewerId: string | null) {
  const v = await visibilityFilters(viewerId);
  const conds = [isNull(posts.deletedAt), eq(posts.published, true)];
  if (v.excludedAuthors.length) conds.push(notInArray(posts.authorId, v.excludedAuthors));
  if (v.excludedCircles.length) conds.push(sql`(${posts.circleId} IS NULL OR ${posts.circleId} NOT IN ${v.excludedCircles})`);
  return { conds, mutedWords: v.mutedWords };
}

async function hiddenPostIds(viewerId: string | null) {
  if (!viewerId) return [];
  const rows = await db.select({ id: hiddenPosts.postId }).from(hiddenPosts).where(eq(hiddenPosts.userId, viewerId));
  return rows.map((r) => r.id);
}

/** Following feed: strictly chronological posts from people you follow + yourself. */
export async function followingFeed(viewerId: string, cursor: string | null) {
  const c = decodeCursor<Cursor>(cursor);
  const f = await db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, viewerId));
  const authorIds = [viewerId, ...f.map((x) => x.id)];
  const { conds, mutedWords } = await baseWhere(viewerId);
  const hidden = await hiddenPostIds(viewerId);
  const where = and(
    ...conds,
    inArray(posts.authorId, authorIds),
    hidden.length ? notInArray(posts.id, hidden) : undefined,
    c ? sql`(${posts.createdAt}, ${posts.id}) < (${new Date(c.t).toISOString()}::timestamptz, ${c.id})` : undefined,
  );
  const rows = await db
    .select({ id: posts.id, createdAt: posts.createdAt, text: posts.text })
    .from(posts)
    .where(where)
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(PAGE + 1);
  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE).filter((r) => !containsMutedWord(r.text, mutedWords));
  const items = await hydratePosts(
    page.map((r) => r.id),
    viewerId,
  );
  const last = rows[Math.min(rows.length, PAGE) - 1];
  return { items, nextCursor: hasMore && last ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id }) : null };
}

/** Count of posts newer than a timestamp in the following feed ("New posts" pill). */
export async function newFollowingCount(viewerId: string, since: Date) {
  const f = await db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, viewerId));
  const authorIds = [viewerId, ...f.map((x) => x.id)];
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(posts)
    .where(and(isNull(posts.deletedAt), eq(posts.published, true), inArray(posts.authorId, authorIds), gt(posts.createdAt, since)));
  return c;
}

export { discoverScore } from "./ranking";
import { discoverScore } from "./ranking";

export async function discoverFeed(viewerId: string | null, cursor: string | null, interests: string[] = [], myCircleIds: string[] = []) {
  const offset = decodeCursor<{ o: number }>(cursor)?.o ?? 0;
  const { conds, mutedWords } = await baseWhere(viewerId);
  const since = new Date(Date.now() - 7 * 86_400_000);
  const hidden = await hiddenPostIds(viewerId);
  const candidates = await db
    .select({
      id: posts.id,
      createdAt: posts.createdAt,
      circleId: posts.circleId,
      text: posts.text,
      authorPrivate: users.isPrivate,
      r: sql<number>`(select count(*) from ${reactions} where ${reactions.postId} = ${posts.id})::int`,
      c: sql<number>`(select count(*) from ${comments} where ${comments.postId} = ${posts.id} and ${comments.deletedAt} is null)::int`,
      rp: sql<number>`(select count(*) from posts p2 where p2.repost_of_id = ${posts.id} and p2.deleted_at is null)::int`,
      tags: sql<string[]>`coalesce((select array_agg(tag) from ${postHashtags} where ${postHashtags.postId} = ${posts.id}), '{}')`,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(and(...conds, gt(posts.createdAt, since), eq(users.isPrivate, false), isNull(posts.repostOfId), hidden.length ? notInArray(posts.id, hidden) : undefined))
    .orderBy(desc(posts.createdAt))
    .limit(400);
  const now = Date.now();
  const scored = candidates
    .filter((p) => !containsMutedWord(p.text, mutedWords))
    .map((p) => {
      const tagHit = p.tags.find((t) => interests.includes(t));
      const circleHit = p.circleId && myCircleIds.includes(p.circleId);
      const ageHours = (now - p.createdAt.getTime()) / 3_600_000;
      const score = discoverScore({ reactions: p.r, comments: p.c, reposts: p.rp, ageHours, affinity: !!(tagHit || circleHit) });
      const reason = tagHit ? `Popular in #${tagHit}, a tag you follow` : circleHit ? "Popular in one of your circles" : p.r + p.c + p.rp > 0 ? "Getting friendly attention recently" : "Fresh from the community";
      return { id: p.id, score, reason };
    })
    .sort((a, b) => b.score - a.score);
  const page = scored.slice(offset, offset + PAGE);
  const items = await hydratePosts(
    page.map((p) => p.id),
    viewerId,
  );
  for (const it of items) it.discoverReason = page.find((p) => p.id === it.id)?.reason;
  return { items, nextCursor: offset + PAGE < scored.length ? encodeCursor({ o: offset + PAGE }) : null };
}

/** Generic chronological list used by profiles, circles, tags, bookmarks. */
export async function postList(opts: { viewerId: string | null; cursor: string | null; where: ReturnType<typeof and>[]; includeDeleted?: boolean }) {
  const c = decodeCursor<Cursor>(opts.cursor);
  const { conds, mutedWords } = await baseWhere(opts.viewerId);
  const where = and(...(opts.includeDeleted ? conds.slice(1) : conds), ...opts.where, c ? lt(posts.createdAt, new Date(c.t)) : undefined);
  const rows = await db
    .select({ id: posts.id, createdAt: posts.createdAt, text: posts.text })
    .from(posts)
    .where(where)
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(PAGE + 1);
  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE).filter((r) => !containsMutedWord(r.text, mutedWords));
  const items = await hydratePosts(
    page.map((r) => r.id),
    opts.viewerId,
  );
  const last = rows[Math.min(rows.length, PAGE) - 1];
  return { items, nextCursor: hasMore && last ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id }) : null };
}

/** Single post with visibility check (returns null when the viewer must not see it). */
export async function getVisiblePost(id: string, viewerId: string | null) {
  const { conds } = await baseWhere(viewerId);
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, id), ...conds.slice(1)))
    .limit(1);
  if (!rows.length) return null;
  const [p] = await hydratePosts([id], viewerId);
  return p ?? null;
}
