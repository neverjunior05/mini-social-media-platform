"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import { api } from "@/lib/client";
import { useViewer } from "@/components/providers";

export function TrendingList({ tags }: { tags: { tag: string; count: number }[] }) {
  if (!tags.length) return <p className="text-sm text-muted">Nothing trending yet. Post with a #hashtag!</p>;
  return (
    <ul className="space-y-1">
      {tags.map((t, i) => (
        <motion.li key={t.tag} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
          <Link href={`/tag/${encodeURIComponent(t.tag)}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm hover:bg-elevated">
            <span className="font-semibold">#{t.tag}</span><span className="text-xs text-muted">{t.count} posts</span>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}

type U = { id: string; username: string; displayName: string; avatarUrl: string; bio: string; isPrivate: boolean };
export function SuggestedUsers({ limit = 4 }: { limit?: number }) {
  const viewer = useViewer();
  const [users, setUsers] = useState<U[] | null>(null);
  useEffect(() => {
    api<{ users: U[] }>("/api/users/suggestions").then((r) => setUsers(r.users.slice(0, limit))).catch(() => setUsers([]));
  }, [limit]);
  if (!users) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-10" />)}</div>;
  if (!users.length) return <p className="text-sm text-muted">You're following everyone we'd suggest. Nice.</p>;
  return (
    <ul className="space-y-2">
      {users.map((u) => (
        <li key={u.id} className="flex items-center gap-2">
          <Link href={`/u/${u.username}`}><Avatar src={u.avatarUrl} name={u.displayName} size={38} /></Link>
          <div className="min-w-0 flex-1"><Link href={`/u/${u.username}`} className="block truncate text-sm font-semibold hover:underline">{u.displayName}</Link><span className="block truncate text-xs text-muted">@{u.username}</span></div>
          {viewer && <FollowButton username={u.username} initialState="none" isPrivate={u.isPrivate} small />}
        </li>
      ))}
    </ul>
  );
}
