import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pollOptions, pollVotes, polls } from "@/db/schema";
import { handler, json, ApiError, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getVisiblePost } from "@/lib/feed";
import { z } from "zod";

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const { id } = await params;
  const user = await requireUser();
  const { optionId } = z.object({ optionId: z.string() }).parse(await req.json());
  const post = await getVisiblePost(id, user.id);
  if (!post?.poll) throw new ApiError("Poll not found", 404);
  const [poll] = await db.select().from(polls).where(eq(polls.id, post.poll.id));
  if (!poll || poll.closed || poll.endsAt < new Date()) throw new ApiError("This poll has ended");
  const [opt] = await db.select().from(pollOptions).where(and(eq(pollOptions.id, optionId), eq(pollOptions.pollId, poll.id)));
  if (!opt) throw new ApiError("Option not found", 404);
  // One vote per user — primary key makes this idempotent; changing a vote is allowed while open.
  await db.insert(pollVotes).values({ pollId: poll.id, optionId, userId: user.id }).onConflictDoUpdate({ target: [pollVotes.pollId, pollVotes.userId], set: { optionId } });
  const fresh = await getVisiblePost(id, user.id);
  return json({ poll: fresh?.poll });
});
