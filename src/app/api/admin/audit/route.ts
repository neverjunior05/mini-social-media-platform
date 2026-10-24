import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { handler, json } from "@/lib/api";
import { requireRole } from "@/lib/auth";
export const GET = handler(async () => {
  await requireRole(["moderator", "admin"]);
  const rows = await db.select({ l: auditLogs, actor: users.username }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).orderBy(desc(auditLogs.createdAt)).limit(200);
  return json({ logs: rows.map((r) => ({ ...r.l, actor: r.actor ?? "system" })) });
});
