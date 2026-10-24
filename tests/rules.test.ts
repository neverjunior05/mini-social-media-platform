import { describe, it, expect } from "vitest";
import { discoverScore, isStoryExpired, pollPercentages, canSeeAuthor, canEditPost } from "../src/lib/ranking";
import { parseHashtags, parseMentions, tokenize, encodeCursor, decodeCursor, safeUrl, containsMutedWord, RESERVED_USERNAMES } from "../src/lib/utils";
import { groupNotifications, groupLabel } from "../src/lib/notifGroup";
import { rateLimit, RateLimitError } from "../src/lib/rateLimit";

describe("Discover ranking", () => {
  it("prefers engagement and recency", () => {
    const fresh = discoverScore({ reactions: 5, comments: 1, reposts: 0, ageHours: 1, affinity: false });
    const old = discoverScore({ reactions: 5, comments: 1, reposts: 0, ageHours: 48, affinity: false });
    expect(fresh).toBeGreaterThan(old);
  });
  it("weights comments ×2 and reposts ×3", () => {
    const base = { ageHours: 2, affinity: false };
    expect(discoverScore({ reactions: 0, comments: 1, reposts: 0, ...base })).toBeCloseTo(discoverScore({ reactions: 2, comments: 0, reposts: 0, ...base }));
    expect(discoverScore({ reactions: 0, comments: 0, reposts: 1, ...base })).toBeCloseTo(discoverScore({ reactions: 3, comments: 0, reposts: 0, ...base }));
  });
  it("boosts affinity ×1.5", () => {
    const a = discoverScore({ reactions: 3, comments: 0, reposts: 0, ageHours: 3, affinity: true });
    const b = discoverScore({ reactions: 3, comments: 0, reposts: 0, ageHours: 3, affinity: false });
    expect(a / b).toBeCloseTo(1.5);
  });
});

describe("Cursor pagination", () => {
  it("round-trips and rejects garbage", () => {
    const c = encodeCursor({ t: "2026-01-01T00:00:00.000Z", id: "abc" });
    expect(decodeCursor<{ t: string; id: string }>(c)).toEqual({ t: "2026-01-01T00:00:00.000Z", id: "abc" });
    expect(decodeCursor("not-base64!!")).toBeNull();
    expect(decodeCursor(null)).toBeNull();
  });
});

describe("Privacy & block visibility", () => {
  const base = { viewerId: "v", authorId: "a", authorPrivate: false, followed: false, blockedEitherWay: false, muted: false, suspended: false };
  it("hides blocked, muted and suspended authors", () => {
    expect(canSeeAuthor({ ...base, blockedEitherWay: true })).toBe(false);
    expect(canSeeAuthor({ ...base, muted: true })).toBe(false);
    expect(canSeeAuthor({ ...base, suspended: true })).toBe(false);
  });
  it("private accounts require a follow (guests never see them)", () => {
    expect(canSeeAuthor({ ...base, authorPrivate: true })).toBe(false);
    expect(canSeeAuthor({ ...base, authorPrivate: true, followed: true })).toBe(true);
    expect(canSeeAuthor({ ...base, authorPrivate: true, viewerId: null })).toBe(false);
    expect(canSeeAuthor({ ...base, authorPrivate: true, viewerIsStaff: true })).toBe(true);
  });
  it("authors always see themselves, even when switching private↔public", () => {
    expect(canSeeAuthor({ ...base, viewerId: "a", authorPrivate: true })).toBe(true);
  });
});

describe("Hashtag & mention parsing", () => {
  it("extracts unique lowercase tags and handles", () => {
    expect(parseHashtags("Loving #Hiking and #hiking with #Coffee ☕ #slow_mornings")).toEqual(["hiking", "coffee", "slow_mornings"]);
    expect(parseMentions("hey @Maya_Draws and @theo_trails, also email me@example.com")).toEqual(["maya_draws", "theo_trails"]);
  });
  it("tokenizes safely without HTML", () => {
    const t = tokenize("<b>hi</b> @maya #art https://example.com/x");
    expect(t.map((x) => x.kind)).toEqual(["text", "mention", "text", "hashtag", "text", "link"]);
    expect(t[0].value).toBe("<b>hi</b> ");
  });
  it("blocks unsafe URL protocols and reserved usernames", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("https://ok.example")).toBe("https://ok.example/");
    expect(RESERVED_USERNAMES.has("admin")).toBe(true);
  });
  it("muted words hide posts", () => {
    expect(containsMutedWord("No SPOILERS please", ["spoiler"])).toBe(true);
    expect(containsMutedWord("All good", ["spoiler"])).toBe(false);
  });
});

describe("Notification grouping", () => {
  const actor = (id: string) => ({ id, username: id, displayName: id[0].toUpperCase() + id.slice(1), avatarUrl: "" });
  it("groups same-type same-post within a day and labels '+N others'", () => {
    const now = new Date();
    const rows = ["maya", "theo", "pip", "noor", "kit", "remy"].map((u, i) => ({ id: String(i), type: "reaction" as const, postId: "p1", commentId: null, meta: null, read: i > 2, createdAt: new Date(now.getTime() - i * 60_000), actor: actor(u) }));
    const g = groupNotifications(rows);
    expect(g).toHaveLength(1);
    expect(g[0].count).toBe(6);
    expect(g[0].read).toBe(false);
    expect(groupLabel(g[0])).toBe("Maya and 5 others reacted to your post");
  });
  it("does not group mentions or different posts", () => {
    const rows = [
      { id: "1", type: "mention" as const, postId: "p1", commentId: null, meta: null, read: false, createdAt: new Date(), actor: actor("maya") },
      { id: "2", type: "mention" as const, postId: "p1", commentId: null, meta: null, read: false, createdAt: new Date(), actor: actor("theo") },
      { id: "3", type: "reaction" as const, postId: "p2", commentId: null, meta: null, read: false, createdAt: new Date(), actor: actor("pip") },
    ];
    expect(groupNotifications(rows)).toHaveLength(3);
  });
});

describe("Polls", () => {
  it("percentages sum to 100 and ended polls can't be voted on", () => {
    expect(pollPercentages([1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(100);
    expect(pollPercentages([0, 0])).toEqual([0, 0]);
    expect(pollPercentages([3, 1])).toEqual([75, 25]);
  });
});

describe("Story expiry & edit window", () => {
  it("expires after 24h or when flagged", () => {
    const now = new Date("2026-01-02T00:00:00Z");
    expect(isStoryExpired({ expiresAt: "2026-01-01T23:59:59Z" }, now)).toBe(true);
    expect(isStoryExpired({ expiresAt: "2026-01-02T00:00:01Z" }, now)).toBe(false);
    expect(isStoryExpired({ expiresAt: "2026-01-03T00:00:00Z", expired: true }, now)).toBe(true);
  });
  it("edit window closes after 15 minutes", () => {
    const t = Date.now();
    expect(canEditPost(new Date(t - 10 * 60_000), t)).toBe(true);
    expect(canEditPost(new Date(t - 16 * 60_000), t)).toBe(false);
  });
});

describe("Rate limiting", () => {
  it("blocks after max hits in window", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, { max: 3, windowMs: 60_000 });
    expect(() => rateLimit(key, { max: 3, windowMs: 60_000 })).toThrow(RateLimitError);
  });
});
