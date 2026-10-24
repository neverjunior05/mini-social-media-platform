import { handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { fetchLinkPreview } from "@/lib/linkPreview";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`preview:${user.id}`, LIMITS.search);
  const url = new URL(req.url).searchParams.get("url") ?? "";
  return json({ preview: await fetchLinkPreview(url) });
});
