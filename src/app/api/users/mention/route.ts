import { ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { hiddenUserIds } from "@/lib/permissions";

/** @mention autocomplete. */
export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[^a-z0-9_ ]/gi, "").slice(0, 30);
  if (!q) return json({ users: [] });
  const hidden = await hiddenUserIds(user.id);
  const rows = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl })
    .from(users)
    .where(or(ilike(users.username, `${q}%`), ilike(users.displayName, `${q}%`)))
    .limit(8);
  return json({ users: rows.filter((r) => !hidden.has(r.id)) });
});
