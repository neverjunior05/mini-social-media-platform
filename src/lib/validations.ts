import { z } from "zod";
import { site } from "@/config/site";
import { USERNAME_RE } from "./utils";

const httpUrl = z.string().url().max(2000).refine((u) => /^https?:\/\//i.test(u), "Only http(s) links are allowed");

export const registerSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8, "Password needs at least 8 characters").max(100),
  username: z.string().regex(USERNAME_RE, "3–20 lowercase letters, numbers or underscores"),
  displayName: z.string().min(1).max(40),
  website: z.string().max(0).optional(), // honeypot — must stay empty
});
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1), website: z.string().max(0).optional() });

export const postSchema = z
  .object({
    text: z.string().max(site.postMaxLength, `Keep it under ${site.postMaxLength} characters`).default(""),
    media: z.array(z.object({ url: httpUrl, alt: z.string().max(300).default("") })).max(4).default([]),
    poll: z
      .object({ options: z.array(z.string().min(1).max(60)).min(2).max(4), durationHours: z.number().int().min(1).max(168) })
      .nullable()
      .optional(),
    circleId: z.string().nullable().optional(),
    repostOfId: z.string().nullable().optional(),
    scheduledAt: z.string().datetime().nullable().optional(),
    website: z.string().max(0).optional(),
  })
  .refine((p) => p.text.trim().length > 0 || p.media.length > 0 || p.poll || p.repostOfId, { message: "Say something, add a photo or a poll" });

export const commentSchema = z.object({ text: z.string().min(1).max(500), parentId: z.string().nullable().optional() });
export const reactionSchema = z.object({ type: z.enum(["love", "laugh", "wow", "hug", "fire", "clap"]).nullable() });
export const storySchema = z.object({
  type: z.enum(["image", "text"]),
  imageUrl: httpUrl.optional(),
  text: z.string().max(140).optional(),
  bgStyle: z.enum(["sunset", "ocean", "mint", "plum"]).default("sunset"),
});
export const circleSchema = z.object({
  name: z.string().min(2).max(40),
  description: z.string().max(300).default(""),
  rules: z.string().max(1000).default(""),
  coverUrl: httpUrl.optional().or(z.literal("")),
  isPrivate: z.boolean().default(false),
});
export const messageSchema = z.object({ text: z.string().max(2000).default(""), imageUrl: httpUrl.optional().nullable(), clientId: z.string().max(64).optional() });
export const conversationSchema = z.object({ memberIds: z.array(z.string()).min(1).max(site.maxGroupChat - 1), name: z.string().max(40).optional() });
export const reportSchema = z.object({
  targetType: z.enum(["post", "comment", "user", "message"]),
  targetId: z.string(),
  reason: z.string().min(2).max(60),
  details: z.string().max(1000).default(""),
});
export const settingsSchema = z.object({
  displayName: z.string().min(1).max(40).optional(),
  bio: z.string().max(200).optional(),
  link: httpUrl.or(z.literal("")).optional(),
  avatarUrl: httpUrl.optional(),
  bannerUrl: httpUrl.or(z.literal("")).optional(),
  isPrivate: z.boolean().optional(),
  allowMessagesFrom: z.enum(["everyone", "followers", "nobody"]).optional(),
  allowMentionsFrom: z.enum(["everyone", "followers", "nobody"]).optional(),
  notifPrefs: z.record(z.string(), z.boolean()).optional(),
  reduceMotion: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  takeABreak: z.boolean().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  interests: z.array(z.string().max(30)).max(15).optional(),
  onboarded: z.boolean().optional(),
  pinnedPostId: z.string().nullable().optional(),
  mutedWords: z.array(z.string().min(1).max(40)).max(50).optional(),
});
export const onboardingSchema = z.object({
  username: z.string().regex(USERNAME_RE).optional(),
  avatarUrl: httpUrl,
  interests: z.array(z.string()).max(15),
  follow: z.array(z.string()).max(30),
});
