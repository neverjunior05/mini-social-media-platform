import { handler, json, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createPost } from "@/lib/posts";
import { hydratePosts } from "@/lib/feed";
import { postSchema } from "@/lib/validations";
import { ApiError } from "@/lib/api";

export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const body = postSchema.parse(await req.json());
  if (body.website) throw new ApiError("Bot check failed");
  const r = await createPost(user, body);
  if (r.toggledOff) return json({ toggledOff: true });
  const [post] = await hydratePosts([r.id], user.id);
  return json({ post }, { status: 201 });
});
