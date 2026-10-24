/**
 * Starts the in-process worker loop (story expiry, poll closing, trending, scheduled posts,
 * account-deletion grace period) once the Node.js server boots. For multi-instance deployments,
 * run `npx tsx worker/index.ts` as a separate service instead and set DISABLE_INLINE_WORKER=1.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DISABLE_INLINE_WORKER === "1") return;
  const { runAllJobs } = await import("./lib/jobs");
  const g = globalThis as typeof globalThis & { __pebbleWorker?: NodeJS.Timeout };
  if (g.__pebbleWorker) return;
  const tick = () => runAllJobs().catch((e) => console.error("[worker]", e));
  setTimeout(tick, 5_000);
  g.__pebbleWorker = setInterval(tick, 60_000);
}
