import { handler, json } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { newFollowingCount } from "@/lib/feed";
export const GET = handler(async (req: Request) => {
  const user = await getCurrentUser();
  const since = new URL(req.url).searchParams.get("since");
  if (!user || !since) return json({ count: 0 });
  return json({ count: await newFollowingCount(user.id, new Date(since)) });
});
