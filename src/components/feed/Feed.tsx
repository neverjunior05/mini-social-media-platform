"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check } from "@phosphor-icons/react";
import confetti from "canvas-confetti";
import type { FeedPost } from "@/lib/feed";
import { PostCard } from "@/components/post/PostCard";
import { PostSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/client";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Page = { items: FeedPost[]; nextCursor: string | null; private?: boolean; blocked?: boolean; hidden?: boolean };
type Props = {
  endpoint: string; // e.g. /api/feed?type=following
  initial?: Page;
  emptyTitle?: string;
  emptyHint?: string;
  showNewPill?: boolean;
  caughtUpText?: string;
  emptyAction?: React.ReactNode;
};

/**
 * Cursor-paginated feed with intersection-observer loading, "New posts" pill,
 * "You're all caught up" marker, and global new-post injection (from any composer).
 */
export function Feed({ endpoint, initial, emptyTitle = "Nothing here yet", emptyHint, showNewPill, caughtUpText = "You're all caught up", emptyAction }: Props) {
  const [items, setItems] = useState<FeedPost[]>(initial?.items ?? []);
  const [cursor, setCursor] = useState<string | null>(initial?.nextCursor ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(initial ? !initial.nextCursor : false);
  const [flags, setFlags] = useState<{ private?: boolean; blocked?: boolean; hidden?: boolean }>({ private: initial?.private, blocked: initial?.blocked, hidden: initial?.hidden });
  const [newCount, setNewCount] = useState(0);
  const sentinel = useRef<HTMLDivElement>(null);
  const caughtRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<string>(initial?.items[0] ? new Date(initial.items[0].createdAt).toISOString() : new Date().toISOString());
  const reduced = useReducedMotion();
  const sep = endpoint.includes("?") ? "&" : "?";

  const load = useCallback(
    async (reset = false) => {
      setLoading(true);
      setError(null);
      try {
        const r = await api<Page>(`${endpoint}${reset || !cursor ? "" : `${sep}cursor=${encodeURIComponent(cursor)}`}`);
        setItems((prev) => (reset ? r.items : [...prev, ...r.items.filter((p) => !prev.some((x) => x.id === p.id))]));
        setCursor(r.nextCursor);
        setDone(!r.nextCursor);
        setFlags({ private: r.private, blocked: r.blocked, hidden: r.hidden });
        if (r.items[0] && (reset || !items.length)) latestRef.current = new Date(r.items[0].createdAt).toISOString();
        if (reset) setNewCount(0);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint, cursor],
  );

  useEffect(() => {
    if (!initial) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && !loading && cursor && load(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [load, loading, cursor, done]);

  // "New posts" pill: poll for fresh posts
  useEffect(() => {
    if (!showNewPill) return;
    const t = setInterval(() => api<{ count: number }>(`/api/feed/new?since=${encodeURIComponent(latestRef.current)}`).then((r) => setNewCount(r.count)).catch(() => {}), 30_000);
    return () => clearInterval(t);
  }, [showNewPill]);

  // Posts published from any composer (inline or global modal) land at the top
  useEffect(() => {
    const h = (e: Event) => {
      const p = (e as CustomEvent<FeedPost>).detail;
      setItems((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
      latestRef.current = new Date().toISOString();
    };
    window.addEventListener("pebble:new-post", h);
    return () => window.removeEventListener("pebble:new-post", h);
  }, []);

  // Caught-up celebration (once, when visible)
  useEffect(() => {
    const el = caughtRef.current;
    if (!el || !done || reduced) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const r = el.getBoundingClientRect();
        confetti({ particleCount: 40, spread: 70, startVelocity: 18, gravity: 0.6, ticks: 120, scalar: 0.7, origin: { x: (r.left + r.width / 2) / window.innerWidth, y: r.top / window.innerHeight }, colors: ["#FFA877", "#FF5E6C", "#E83E9B", "#7B5CFF", "#3DDBB0"] });
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [done, reduced, items.length]);

  const update = (p: FeedPost) => setItems((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  const remove = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id && x.repostOf?.id !== id));

  if (flags.private) return <EmptyState title="This account is private" hint="Follow to see their posts. They'll get a request to approve." />;
  if (flags.blocked) return <EmptyState title="Nothing to see here" hint="You can't view this account's posts." />;
  if (flags.hidden) return <EmptyState title="Likes are private" hint="Only the account owner can see what they liked." />;

  return (
    <div className="relative space-y-4" aria-busy={loading}>
      <div aria-live="polite" className="sr-only">{newCount > 0 ? `${newCount} new posts available` : ""}</div>
      <AnimatePresence>
        {newCount > 0 && (
          <motion.button
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); load(true); }}
            className="sunset sticky top-20 z-30 mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-glow"
          >
            <ArrowUp size={16} weight="bold" /> {newCount} new {newCount === 1 ? "post" : "posts"}
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {items.map((p, i) => (
          <PostCard key={p.id} post={p} index={i} priority={i < 2} onChange={update} onRemove={remove} onNewPost={(np) => setItems((prev) => [np, ...prev])} />
        ))}
      </AnimatePresence>
      {loading && <div className="space-y-4"><PostSkeleton /><PostSkeleton /></div>}
      {error && (
        <div className="card p-4 text-center text-sm">
          <p className="text-error">{error}</p>
          <button className="btn-ghost mt-2" onClick={() => load()}>Try again</button>
        </div>
      )}
      {!loading && !error && items.length === 0 && <EmptyState title={emptyTitle} hint={emptyHint} action={emptyAction} />}
      <div ref={sentinel} className="h-px" aria-hidden />
      {done && items.length > 0 && (
        <div ref={caughtRef} className="flex flex-col items-center gap-2 py-8 text-center">
          <motion.span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint/20 text-mint" initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
            <motion.svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="M5 12l5 5L20 7" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }} />
            </motion.svg>
          </motion.span>
          <p className="font-accent text-2xl text-ink">{caughtUpText}</p>
          <p className="text-sm text-muted">That's everything new. Go enjoy your day ✨</p>
        </div>
      )}
      <span className="sr-only"><Check /></span>
    </div>
  );
}
