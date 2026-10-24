import { handler, json } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { discoverFeed, followingFeed } from "@/lib/feed";
import { circleMembershipMap } from "@/lib/permissions";

export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "following";
  const cursor = url.searchParams.get("cursor");
  const user = await getCurrentUser();
  if (type === "discover") {
    const circles = user ? [...(await circleMembershipMap(user.id)).keys()] : [];
    return json(await discoverFeed(user?.id ?? null, cursor, user?.interests ?? [], circles));
  }
  if (!user) return json({ items: [], nextCursor: null });
  return json(await followingFeed(user.id, cursor));
});
