import { desc } from "drizzle-orm";
import { db } from "@/db";
import { trendingTags } from "@/db/schema";
import { handler, json } from "@/lib/api";
export const GET = handler(async () => {
  const tags = await db.select().from(trendingTags).orderBy(desc(trendingTags.score)).limit(8);
  return json({ tags });
});
