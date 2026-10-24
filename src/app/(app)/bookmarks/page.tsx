import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Feed } from "@/components/feed/Feed";
import { getCurrentUser } from "@/lib/auth";
export const metadata: Metadata = { title: "Bookmarks", robots: { index: false } };
export default async function BookmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/bookmarks");
  return (
    <div className="space-y-4">
      <header><h1 className="text-2xl">Bookmarks</h1><p className="text-sm text-muted">Private — only you can see these.</p></header>
      <Feed endpoint="/api/bookmarks" caughtUpText="That's all your saved posts" emptyTitle="No bookmarks yet" emptyHint="Tap the bookmark icon on any post to keep it here." />
    </div>
  );
}
