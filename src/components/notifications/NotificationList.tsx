"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, ChatCircle, At, UserPlus, Bell, ChartBar, Eye, Repeat, ShieldCheck } from "@phosphor-icons/react";
import type { NotifGroup } from "@/lib/notifGroup";
import { groupLabel } from "@/lib/notifGroup";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/utils";
import { useUiStore } from "@/store/useUiStore";
import { onRealtime } from "@/hooks/useRealtime";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

const ICON: Record<string, React.ReactNode> = {
  reaction: <Heart size={18} weight="fill" className="text-r-love" />,
  comment: <ChatCircle size={18} weight="fill" className="text-sky" />,
  mention: <At size={18} weight="bold" className="text-violet" />,
  follow: <UserPlus size={18} weight="fill" className="text-mint" />,
  follow_request: <UserPlus size={18} weight="fill" className="text-peach" />,
  follow_accepted: <UserPlus size={18} weight="fill" className="text-mint" />,
  poll_ended: <ChartBar size={18} weight="fill" className="text-violet" />,
  story_view: <Eye size={18} weight="fill" className="text-magenta" />,
  repost: <Repeat size={18} weight="bold" className="text-mint" />,
  moderation: <ShieldCheck size={18} weight="fill" className="text-warning" />,
};

export function NotificationList() {
  const [groups, setGroups] = useState<NotifGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [glow, setGlow] = useState<Set<string>>(new Set());
  const setUnread = useUiStore((s) => s.setUnread);
  const load = () => api<{ groups: NotifGroup[] }>("/api/notifications").then((r) => setGroups(r.groups)).catch((e) => setError((e as Error).message));
  useEffect(() => {
    load().then(() => api("/api/notifications", { method: "PATCH", json: {} }).then(() => setUnread({ notifications: 0 })));
    return onRealtime((ev) => {
      if (ev.type === "notification") load().then(() => { setGlow(new Set(["new"])); setTimeout(() => setGlow(new Set()), 1500); api("/api/notifications", { method: "PATCH", json: {} }); });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const decide = async (requesterId: string, accept: boolean, key: string) => {
    await api("/api/users/requests", { method: "POST", json: { requesterId, accept } });
    setGroups((g) => (g ?? []).filter((x) => x.key !== key));
  };
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between"><h1 className="text-2xl">Notifications</h1><Link href="/settings#notifications" className="text-sm font-semibold text-muted hover:text-ink">Preferences</Link></header>
      <div aria-live="polite" className="sr-only">{glow.size ? "New notification" : ""}</div>
      {error && <p className="text-error">{error}</p>}
      {!groups && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}
      {groups && groups.length === 0 && <EmptyState title="All quiet" hint="When people react, comment, or follow you, it shows up here." />}
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {groups?.map((g, i) => {
            const href = g.postId ? `/post/${g.postId}` : g.actors[0] ? `/u/${g.actors[0].username}` : "#";
            return (
              <motion.li key={g.key} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className={`card flex items-start gap-3 p-3 ${!g.read ? "border-coral/40 bg-peach/10" : ""} ${glow.size && i === 0 ? "shadow-glow" : ""}`}>
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-elevated">{ICON[g.type] ?? <Bell size={18} />}</span>
                <div className="min-w-0 flex-1">
                  <motion.div className="mb-1 flex" initial="rest" whileHover="hover">
                    {g.actors.slice(0, 5).map((a, j) => (
                      <motion.span key={a.id} variants={{ rest: { x: j * -10 }, hover: { x: j * 2 } }} className="rounded-full border-2 border-surface"><Link href={`/u/${a.username}`}><Avatar src={a.avatarUrl} name={a.displayName} size={28} /></Link></motion.span>
                    ))}
                  </motion.div>
                  <Link href={href} className="block text-sm hover:underline">{groupLabel(g)}</Link>
                  <p className="text-xs text-muted">{timeAgo(g.latest)}</p>
                  {g.type === "follow_request" && g.actors[0] && (
                    <div className="mt-2 flex gap-2"><button className="btn-primary min-h-9 px-3 text-xs" onClick={() => decide(g.actors[0].id, true, g.key)}>Accept</button><button className="btn-ghost min-h-9 px-3 text-xs" onClick={() => decide(g.actors[0].id, false, g.key)}>Decline</button></div>
                  )}
                </div>
                {!g.read && <span className="mt-2 h-2 w-2 rounded-full bg-coral" aria-label="unread" />}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
