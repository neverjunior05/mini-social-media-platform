/**
 * Pebble database schema (Drizzle ORM / PostgreSQL).
 * All demo data seeded into these tables is FICTIONAL.
 */
import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  primaryKey,
  index,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () =>
  text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export type Role = "member" | "moderator" | "admin";
export type NotifPrefs = Record<string, boolean>;

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    username: text("username").notNull().unique(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url").notNull(),
    bannerUrl: text("banner_url"),
    bio: text("bio").default("").notNull(),
    link: text("link"),
    role: text("role").$type<Role>().notNull().default("member"),
    isPrivate: boolean("is_private").notNull().default(false),
    accentColor: text("accent_color").default("#FF5E6C").notNull(),
    reduceMotion: boolean("reduce_motion").notNull().default(false),
    soundEnabled: boolean("sound_enabled").notNull().default(false),
    takeABreak: boolean("take_a_break").notNull().default(false),
    allowMessagesFrom: text("allow_messages_from").notNull().default("everyone"), // everyone | followers | nobody
    allowMentionsFrom: text("allow_mentions_from").notNull().default("everyone"),
    interests: jsonb("interests").$type<string[]>().notNull().default([]),
    notifPrefs: jsonb("notif_prefs").$type<NotifPrefs>().notNull().default({}),
    onboarded: boolean("onboarded").notNull().default(false),
    emailVerified: boolean("email_verified").notNull().default(false),
    suspendedUntil: timestamp("suspended_until", { withTimezone: true }),
    deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
    pinnedPostId: text("pinned_post_id"),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("users_username_idx").on(t.username)],
);

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] }), index("follows_following_idx").on(t.followingId)],
);

export const followRequests = pgTable(
  "follow_requests",
  {
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.requesterId, t.targetId] })],
);

export const circles = pgTable("circles", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  rules: text("rules").notNull().default(""),
  coverUrl: text("cover_url"),
  isPrivate: boolean("is_private").notNull().default(false),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const circleMembers = pgTable(
  "circle_members",
  {
    circleId: text("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // member | moderator | owner
    status: text("status").notNull().default("active"), // active | pending
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.userId] })],
);

export type LinkPreview = { url: string; title: string; description: string; image: string | null; siteName: string };

export const posts = pgTable(
  "posts",
  {
    id: id(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull().default(""),
    circleId: text("circle_id").references(() => circles.id, { onDelete: "cascade" }),
    repostOfId: text("repost_of_id"),
    linkPreview: jsonb("link_preview").$type<LinkPreview | null>(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    published: boolean("published").notNull().default(true),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    removedReason: text("removed_reason"),
    createdAt: createdAt(),
  },
  (t) => [index("posts_author_created_idx").on(t.authorId, t.createdAt), index("posts_created_idx").on(t.createdAt)],
);

export const postMedia = pgTable("post_media", {
  id: id(),
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt").notNull().default(""),
  order: integer("order").notNull().default(0),
});

export const polls = pgTable("polls", {
  id: id(),
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" })
    .unique(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  closed: boolean("closed").notNull().default(false),
});

export const pollOptions = pgTable("poll_options", {
  id: id(),
  pollId: text("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  order: integer("order").notNull().default(0),
});

export const pollVotes = pgTable(
  "poll_votes",
  {
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    optionId: text("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.userId] })],
);

export const postHashtags = pgTable(
  "post_hashtags",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tag] }), index("post_hashtags_tag_idx").on(t.tag)],
);

export const mentions = pgTable(
  "mentions",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
);

export type ReactionType = "love" | "laugh" | "wow" | "hug" | "fire" | "clap";

export const reactions = pgTable(
  "reactions",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<ReactionType>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
);

export const comments = pgTable(
  "comments",
  {
    id: id(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    text: text("text").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("comments_post_idx").on(t.postId)],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
);

export const stories = pgTable(
  "stories",
  {
    id: id(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("image"), // image | text
    imageUrl: text("image_url"),
    text: text("text"),
    bgStyle: text("bg_style").notNull().default("sunset"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    expired: boolean("expired").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("stories_expires_idx").on(t.expiresAt)],
);

export const storyViews = pgTable(
  "story_views",
  {
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    viewerId: text("viewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.viewerId] })],
);

export const conversations = pgTable("conversations", {
  id: id(),
  isGroup: boolean("is_group").notNull().default(false),
  name: text("name"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: createdAt(),
});

export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] })],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull().default(""),
    imageUrl: text("image_url"),
    clientId: text("client_id"),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conv_created_idx").on(t.conversationId, t.createdAt)],
);

export const messageReactions = pgTable(
  "message_reactions",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);

export type NotificationType =
  | "reaction"
  | "comment"
  | "mention"
  | "follow"
  | "follow_request"
  | "follow_accepted"
  | "poll_ended"
  | "story_view"
  | "repost"
  | "moderation";

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<NotificationType>().notNull(),
    postId: text("post_id"),
    commentId: text("comment_id"),
    meta: jsonb("meta").$type<Record<string, string>>(),
    read: boolean("read").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

export const mutes = pgTable(
  "mutes",
  {
    muterId: text("muter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mutedId: text("muted_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.muterId, t.mutedId] })],
);

export const mutedWords = pgTable(
  "muted_words",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.word] })],
);

export const hiddenPosts = pgTable(
  "hidden_posts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
);

export const reports = pgTable("reports", {
  id: id(),
  reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
  targetType: text("target_type").notNull(), // post | comment | user | message
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details").notNull().default(""),
  status: text("status").notNull().default("open"), // open | resolved | dismissed
  resolution: text("resolution"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const appeals = pgTable("appeals", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  postId: text("post_id"),
  text: text("text").notNull(),
  status: text("status").notNull().default("open"), // open | accepted | rejected
  decidedBy: text("decided_by"),
  createdAt: createdAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

export const trendingTags = pgTable("trending_tags", {
  tag: text("tag").primaryKey(),
  score: doublePrecision("score").notNull().default(0),
  count24h: integer("count_24h").notNull().default(0),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dailyStats = pgTable("daily_stats", {
  day: text("day").primaryKey(), // YYYY-MM-DD
  activeUsers: integer("active_users").notNull().default(0),
  posts: integer("posts").notNull().default(0),
  reactions: integer("reactions").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  reportsResolved: integer("reports_resolved").notNull().default(0),
});

export const recentSearches = pgTable(
  "recent_searches",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.query] })],
);

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Circle = typeof circles.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
