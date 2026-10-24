/**
 * Pure ranking & domain rules (no DB) so they can be unit-tested.
 */

/**
 * Discover ranking (explained in the UI):
 *   score = (reactions×1 + comments×2 + reposts×3 + 1) / (hoursSincePost + 2)^1.5
 * Boosted ×1.5 when the post uses a hashtag you follow or belongs to one of your circles.
 */
export function discoverScore(p: { reactions: number; comments: number; reposts: number; ageHours: number; affinity: boolean }) {
  const engagement = p.reactions * 1 + p.comments * 2 + p.reposts * 3 + 1;
  const base = engagement / Math.pow(Math.max(0, p.ageHours) + 2, 1.5);
  return p.affinity ? base * 1.5 : base;
}

/** Stories expire exactly 24h after creation (or when the worker flagged them). */
export function isStoryExpired(s: { expiresAt: Date | string; expired?: boolean }, now = new Date()) {
  return !!s.expired || new Date(s.expiresAt).getTime() <= now.getTime();
}

/** Poll percentages that always sum to 100 (largest-remainder rounding). */
export function pollPercentages(votes: number[]) {
  const total = votes.reduce((a, b) => a + b, 0);
  if (!total) return votes.map(() => 0);
  const raw = votes.map((v) => (v / total) * 100);
  const floored = raw.map(Math.floor);
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const o of order) {
    if (remainder <= 0) break;
    floored[o.i] += 1;
    remainder -= 1;
  }
  return floored;
}

/**
 * Visibility rule used by every feed/search/notification path:
 * a viewer may see an author's content unless blocked either way, muted, suspended,
 * or the author is private and not followed by the viewer.
 */
export function canSeeAuthor(p: { viewerId: string | null; authorId: string; authorPrivate: boolean; followed: boolean; blockedEitherWay: boolean; muted: boolean; suspended: boolean; viewerIsStaff?: boolean }) {
  if (p.viewerId === p.authorId) return true;
  if (p.blockedEitherWay || p.muted || p.suspended) return false;
  if (p.authorPrivate) return !!p.viewerId && (p.followed || !!p.viewerIsStaff);
  return true;
}

/** Edit window: 15 minutes from creation. */
export function canEditPost(createdAt: Date | string, now = Date.now(), windowMinutes = 15) {
  return now - new Date(createdAt).getTime() <= windowMinutes * 60_000;
}
