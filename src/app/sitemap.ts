import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { circles, users } from "@/db/schema";
import { site } from "@/config/site";

/** Public pages only — private accounts/circles, messages, settings etc. are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [u, c] = await Promise.all([db.select({ username: users.username }).from(users).where(eq(users.isPrivate, false)), db.select({ slug: circles.slug }).from(circles).where(eq(circles.isPrivate, false))]);
  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/discover`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${site.url}/circles`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site.url}/policies`, changeFrequency: "monthly", priority: 0.3 },
    ...u.map((x) => ({ url: `${site.url}/u/${x.username}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...c.map((x) => ({ url: `${site.url}/circles/${x.slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}
