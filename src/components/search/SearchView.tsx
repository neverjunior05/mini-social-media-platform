"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MagnifyingGlass, ClockCounterClockwise, TrendUp } from "@phosphor-icons/react";
import type { FeedPost } from "@/lib/feed";
import { Avatar } from "@/components/ui/Avatar";
import { PostCard } from "@/components/post/PostCard";
import { api } from "@/lib/client";
import { PostSkeleton } from "@/components/ui/Skeleton";
import { RollingNumber } from "@/components/reactions/ReactionButton";

type Results = { users: { id: string; username: string; displayName: string; avatarUrl: string; bio: string; isPrivate: boolean }[]; tags: { tag: string; c: number }[]; circles: { id: string; slug: string; name: string; description: string }[]; posts: FeedPost[]; recent: string[] };

/** Instant suggestions while typing, recent searches, trending tags (24h), results with layout animations. */
export function SearchView() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Results | null>(null);
  const [trending, setTrending] = useState<{ tag: string; count24h: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committed, setCommitted] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ tags: typeof trending }>("/api/trending").then((r) => setTrending(r.tags)).catch(() => {});
    api<Results>("/api/search").then(setRes).catch(() => {});
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    const t = setTimeout(() => api<Results>(`/api/search?q=${encodeURIComponent(q)}`).then((r) => { setRes(r); setError(null); }).catch((e) => setError((e as Error).message)).finally(() => setLoading(false)), 220);
    return () => clearTimeout(t);
  }, [q]);
  const commit = (value: string) => {
    setQ(value);
    setCommitted(value);
    api(`/api/search?q=${encodeURIComponent(value)}&save=1`).catch(() => {});
  };
  const showResults = q.trim().length > 0 && res;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Search</h1>
      <form role="search" onSubmit={(e) => { e.preventDefault(); commit(q); }} className="relative">
        <MagnifyingGlass size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, posts, #tags, circles" className="input pl-11 pr-4 text-base" aria-label="Search" autoComplete="off" />
      </form>
      <AnimatePresence mode="wait">
        {!showResults ? (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-4 sm:grid-cols-2">
            <section className="card p-4">
              <h2 className="mb-2 flex items-center gap-1 text-base"><ClockCounterClockwise size={18} /> Recent</h2>
              {res?.recent?.length ? <ul className="space-y-1">{res.recent.map((r) => <li key={r}><button onClick={() => commit(r)} className="min-h-10 w-full rounded-xl px-2 text-left text-sm hover:bg-elevated">{r}</button></li>)}</ul> : <p className="text-sm text-muted">Your recent searches show up here.</p>}
            </section>
            <section className="card p-4">
              <h2 className="mb-2 flex items-center gap-1 text-base"><TrendUp size={18} /> Trending · 24h</h2>
              <ul className="space-y-1">{trending.map((t) => <li key={t.tag}><Link href={`/tag/${encodeURIComponent(t.tag)}`} className="flex min-h-10 items-center justify-between rounded-xl px-2 text-sm hover:bg-elevated"><span className="font-semibold">#{t.tag}</span><span className="flex items-center gap-1 text-xs text-muted"><RollingNumber value={t.count24h} /> posts</span></Link></li>)}</ul>
              {!trending.length && <p className="text-sm text-muted">Nothing trending yet.</p>}
            </section>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4" aria-live="polite">
            {error && <p className="text-sm text-error">{error}</p>}
            {(res!.users.length > 0 || res!.tags.length > 0 || res!.circles.length > 0) && (
              <motion.section layout className="card p-4">
                <div className="flex flex-wrap gap-2">
                  {res!.tags.map((t) => <Link key={t.tag} href={`/tag/${encodeURIComponent(t.tag)}`} className="pill min-h-9 flex items-center bg-lilac text-violet dark:bg-violet/20">#{t.tag} <span className="ml-1 text-xs opacity-70">{t.c}</span></Link>)}
                  {res!.circles.map((c) => <Link key={c.id} href={`/circles/${c.slug}`} className="pill min-h-9 flex items-center">⭕ {c.name}</Link>)}
                </div>
                {res!.users.length > 0 && (
                  <ul className="mt-3 space-y-1">{res!.users.map((u) => <li key={u.id}><Link href={`/u/${u.username}`} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-elevated"><Avatar src={u.avatarUrl} name={u.displayName} size={36} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{u.displayName} {u.isPrivate && "🔒"}</span><span className="block truncate text-xs text-muted">@{u.username} · {u.bio}</span></span></Link></li>)}</ul>
                )}
              </motion.section>
            )}
            {loading && <PostSkeleton />}
            <AnimatePresence>{res!.posts.map((p, i) => <PostCard key={p.id} post={p} index={i} />)}</AnimatePresence>
            {!loading && !res!.posts.length && !res!.users.length && !res!.tags.length && !res!.circles.length && <p className="card p-6 text-center font-accent text-xl text-muted">No results for “{committed || q}”</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
