import { handler, json, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createPost } from "@/lib/posts";
import { hydratePosts } from "@/lib/feed";
import { z } from "zod";

/** Plain repost (toggle) or quote (with text). */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  const { quote } = z.object({ quote: z.string().max(500).optional() }).parse(await req.json().catch(() => ({})));
  const r = await createPost(user, { text: quote ?? "", media: [], repostOfId: id, poll: null });
  if (r.toggledOff) return json({ toggledOff: true });
  const [post] = await hydratePosts([r.id], user.id);
  return json({ post }, { status: 201 });
});
