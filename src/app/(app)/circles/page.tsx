import type { Metadata } from "next";
import { desc, eq, sql, and } from "drizzle-orm";
import { db } from "@/db";
import { circleMembers, circles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { CirclesGrid } from "@/components/circles/CirclesGrid";

export const metadata: Metadata = { title: "Circles", description: "Small interest communities on Pebble." };
export const dynamic = "force-dynamic";

export default async function CirclesPage() {
  const user = await getCurrentUser();
  const rows = await db
    .select({ id: circles.id, slug: circles.slug, name: circles.name, description: circles.description, coverUrl: circles.coverUrl, isPrivate: circles.isPrivate, members: sql<number>`count(${circleMembers.userId}) filter (where ${circleMembers.status} = 'active')::int` })
    .from(circles)
    .leftJoin(circleMembers, eq(circleMembers.circleId, circles.id))
    .groupBy(circles.id)
    .orderBy(desc(sql`count(${circleMembers.userId})`));
  const mine = user ? await db.select({ circleId: circleMembers.circleId, status: circleMembers.status }).from(circleMembers).where(and(eq(circleMembers.userId, user.id))) : [];
  const mineMap = Object.fromEntries(mine.map((m) => [m.circleId, m.status]));
  // Private circles are listed by name only (so people can request), never their content.
  return <CirclesGrid circles={rows.map((c) => ({ ...c, membership: mineMap[c.id] ?? null }))} canCreate={!!user} />;
}
