import { handler, json } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { runAllJobs } from "@/lib/jobs";
/** Manually trigger the worker jobs (admin/moderator) — handy for demoing story expiry. */
export const POST = handler(async () => {
  await requireRole(["moderator", "admin"]);
  return json({ ran: await runAllJobs() });
});
