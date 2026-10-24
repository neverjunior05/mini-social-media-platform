import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { blocks, followRequests, follows, mutes, posts, users } from "@/db/schema";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { canViewProfileContent, isFollowing } from "@/lib/permissions";
import { hydratePosts } from "@/lib/feed";
import { ProfileView } from "@/components/profile/ProfileView";
import { site } from "@/config/site";

type Props = { params: Promise<{ username: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const [u] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
  if (!u) return { title: "Profile" };
  const title = `${u.displayName} (@${u.username})`;
  return { title, description: u.bio || `${u.displayName} on Pebble`, robots: u.isPrivate ? { index: false } : undefined, openGraph: { title, description: u.bio, images: [`/api/og?title=${encodeURIComponent(u.displayName)}&subtitle=${encodeURIComponent("@" + u.username + " · " + u.bio.slice(0, 80))}`] } };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const [u] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
  if (!u) notFound();
  const [[followers], [following], [postCount]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(follows).where(eq(follows.followingId, u.id)),
    db.select({ c: sql<number>`count(*)::int` }).from(follows).where(eq(follows.followerId, u.id)),
    db.select({ c: sql<number>`count(*)::int` }).from(posts).where(and(eq(posts.authorId, u.id), sql`${posts.deletedAt} is null`)),
  ]);
  let followState: "none" | "following" | "requested" = "none";
  let blockedByMe = false, blockedMe = false, muted = false;
  if (viewer && viewer.id !== u.id) {
    if (await isFollowing(viewer.id, u.id)) followState = "following";
    else if ((await db.select().from(followRequests).where(and(eq(followRequests.requesterId, viewer.id), eq(followRequests.targetId, u.id)))).length) followState = "requested";
    blockedByMe = (await db.select().from(blocks).where(and(eq(blocks.blockerId, viewer.id), eq(blocks.blockedId, u.id)))).length > 0;
    blockedMe = (await db.select().from(blocks).where(and(eq(blocks.blockerId, u.id), eq(blocks.blockedId, viewer.id)))).length > 0;
    muted = (await db.select().from(mutes).where(and(eq(mutes.muterId, viewer.id), eq(mutes.mutedId, u.id)))).length > 0;
  }
  const canView = !blockedMe && !blockedByMe && (await canViewProfileContent(viewer, u));
  const pinned = canView && u.pinnedPostId ? (await hydratePosts([u.pinnedPostId], viewer?.id ?? null))[0] ?? null : null;
  const requests = viewer?.id === u.id && u.isPrivate
    ? await db.select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl }).from(followRequests).innerJoin(users, eq(users.id, followRequests.requesterId)).where(eq(followRequests.targetId, u.id))
    : [];
  const jsonLd = !u.isPrivate ? { "@context": "https://schema.org", "@type": "Person", name: u.displayName, alternateName: u.username, description: u.bio, image: u.avatarUrl, url: `${site.url}/u/${u.username}` } : null;
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <ProfileView
        user={JSON.parse(JSON.stringify(publicUser(u)))}
        counts={{ followers: followers.c, following: following.c, posts: postCount.c }}
        followState={followState}
        canView={canView}
        blockedByMe={blockedByMe}
        blockedMe={blockedMe}
        muted={muted}
        pinned={pinned ? JSON.parse(JSON.stringify(pinned)) : null}
        requests={requests}
      />
    </>
  );
}
