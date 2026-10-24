/**
 * Standalone worker (optional). Run with: npx tsx worker/index.ts
 * Executes the same job set as the inline worker every minute.
 */
import "dotenv/config";
import { runAllJobs } from "../src/lib/jobs";

async function loop() {
  const r = await runAllJobs();
  console.log(new Date().toISOString(), "[worker]", JSON.stringify(r));
}
loop();
setInterval(() => loop().catch(console.error), 60_000);
