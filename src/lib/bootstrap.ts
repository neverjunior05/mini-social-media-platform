import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

let checked = false;
/** Seeds fictional demo data on first boot when the database is empty (idempotent, runs once per process). */
export async function ensureSeeded() {
  if (checked) return;
  checked = true;
  try {
    const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(users);
    if (c === 0) {
      const { seedDatabase } = await import("@/db/seed");
      await seedDatabase();
    }
  } catch (e) {
    console.error("[bootstrap] seed check failed", e);
    checked = false;
  }
}
