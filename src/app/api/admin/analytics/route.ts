import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { circles, dailyStats, posts, reports, users } from "@/db/schema";
import { handler, json } from "@/lib/api";
import { requireRole } from "@/lib/auth";
export const GET = handler(async () => {
  await requireRole(["moderator", "admin"]);
  const series = await db.select().from(dailyStats).orderBy(asc(dailyStats.day)).limit(60);
  const [[u], [p], [c], [r]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(users),
    db.select({ c: sql<number>`count(*)::int` }).from(posts),
    db.select({ c: sql<number>`count(*)::int` }).from(circles),
    db.select({ c: sql<number>`count(*)::int` }).from(reports).where(eq(reports.status, "open")),
  ]);
  return json({ series, totals: { users: u.c, posts: p.c, circles: c.c, openReports: r.c } });
});
