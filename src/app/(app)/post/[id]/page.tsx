import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/post/icons";
import { PostCard } from "@/components/post/PostCard";
import { getCurrentUser } from "@/lib/auth";
import { getVisiblePost } from "@/lib/feed";
import { site } from "@/config/site";

type Props = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getVisiblePost(id, null); // metadata only for publicly visible posts
  if (!post || post.deletedAt) return { title: "Post", robots: { index: false } };
  const title = `${post.author.displayName} on Pebble`;
  const description = post.text.slice(0, 160) || "A post on Pebble";
  return { title, description, robots: post.author.isPrivate || post.circle?.isPrivate ? { index: false } : undefined, openGraph: { title, description, images: post.media[0]?.url ? [post.media[0].url] : [`/api/og?title=${encodeURIComponent(post.author.displayName)}&subtitle=${encodeURIComponent(description)}`] } };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  const post = await getVisiblePost(id, user?.id ?? null);
  if (!post) notFound();
  const isPublic = !post.author.isPrivate && !post.circle?.isPrivate && !post.deletedAt;
  const jsonLd = isPublic
    ? { "@context": "https://schema.org", "@type": "SocialMediaPosting", headline: post.text.slice(0, 110), datePublished: new Date(post.createdAt).toISOString(), author: { "@type": "Person", name: post.author.displayName, url: `${site.url}/u/${post.author.username}` }, url: `${site.url}/post/${post.id}`, image: post.media.map((m) => m.url) }
    : null;
  return (
    <div className="space-y-4">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <Link href="/home" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={18} /> Back</Link>
      <PostCard post={JSON.parse(JSON.stringify(post))} detail priority />
    </div>
  );
}
