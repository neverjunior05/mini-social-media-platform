import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/bootstrap";
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await ensureSeeded();
    return Response.json({ ok: true, service: "pebble", time: new Date().toISOString() });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
