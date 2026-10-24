export const site = {
  name: "Pebble",
  tagline: "A calmer, prettier place for small circles.",
  description:
    "Pebble is a mini social platform for friends, classmates and hobby circles. Chronological feed, expressive reactions, 24-hour stories and real-time chat — with no outrage machine.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  postMaxLength: 500,
  editWindowMinutes: 15,
  storyHours: 24,
  deletionGraceDays: 14,
  maxGroupChat: 8,
};

export const REACTIONS = [
  { type: "love", emoji: "❤️", label: "Love", color: "#FF4D6D" },
  { type: "laugh", emoji: "😂", label: "Laugh", color: "#FFC233" },
  { type: "wow", emoji: "😮", label: "Wow", color: "#6C8CFF" },
  { type: "hug", emoji: "🤗", label: "Hug", color: "#FF9A3D" },
  { type: "fire", emoji: "🔥", label: "Fire", color: "#FF6A2B" },
  { type: "clap", emoji: "👏", label: "Clap", color: "#B07CFF" },
] as const;

export const INTERESTS = ["photography", "hiking", "coffee", "books", "music", "art", "pets", "food", "travel", "tech", "film", "gaming", "plants", "fitness", "design"];

export const REPORT_REASONS = ["Spam", "Harassment or bullying", "Hate or discrimination", "Violence or threats", "Nudity or sexual content", "Self-harm", "Misinformation", "Impersonation", "Copyright", "Something else"];
