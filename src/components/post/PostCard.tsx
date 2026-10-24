"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BookmarkSimple, ChatCircle, DotsThree, Repeat, ShareNetwork, PushPin, Sparkle, Prohibit, EyeSlash, Flag, Trash, PencilSimple, SpeakerSlash, Quotes, Link as LinkIcon } from "@phosphor-icons/react";
import type { FeedPost } from "@/lib/feed";
import type { ReactionType } from "@/db/schema";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { RichText } from "./RichText";
import { MediaGrid } from "./MediaGrid";
import { PollCard } from "./PollCard";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { ReactionButton } from "@/components/reactions/ReactionButton";
import { CommentThread } from "@/components/comments/CommentThread";
import { useViewer } from "@/components/providers";
import { useUiStore, toast } from "@/store/useUiStore";
import { api, playSound } from "@/lib/client";
import { cn, timeAgo } from "@/lib/utils";
import { site } from "@/config/site";

type Props = {
  post: FeedPost;
  onChange?: (p: FeedPost) => void;
  onRemove?: (id: string) => void;
  onNewPost?: (p: FeedPost) => void;
  detail?: boolean;
  priority?: boolean;
  index?: number;
};

const isOnline = (d: Date | string) => Date.now() - new Date(d).getTime() < 5 * 60_000;

export function PostCard({ post: initial, onChange, onRemove, onNewPost, detail, priority, index = 0 }: Props) {
  const viewer = useViewer();
  const router = useRouter();
  const setReportTarget = useUiStore((s) => s.setReportTarget);
  const [post, setPostState] = useState(initial);
  const [menu, setMenu] = useState(false);
  const [showComments, setShowComments] = useState(!!detail);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quote, setQuote] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(initial.text);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealText, setAppealText] = useState("");
  const [busy, setBusy] = useState(false);

  const setPost = useCallback(
    (updater: (p: FeedPost) => FeedPost) => {
      setPostState((p) => {
        const next = updater(p);
        onChange?.(next);
        return next;
      });
    },
    [onChange],
  );

  const target = post.isRepost && post.repostOf ? post.repostOf : post;
  const requireAuth = () => {
    if (!viewer) {
      router.push("/login");
      return false;
    }
    return true;
  };

  /** Optimistic reaction with rollback; rapid changes are safe because the server is idempotent (last write wins). */
  const react = async (type: ReactionType | null) => {
    if (!requireAuth()) return;
    const prev = target;
    const counts = { ...prev.reactionCounts };
    if (prev.myReaction) counts[prev.myReaction] = Math.max(0, counts[prev.myReaction] - 1);
    if (type) counts[type] += 1;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    applyTarget((t) => ({ ...t, myReaction: type, reactionCounts: counts, reactionTotal: total }));
    if (type) playSound("pop", useUiStore.getState().soundEnabled);
    try {
      const r = await api<{ reactionCounts: FeedPost["reactionCounts"]; reactionTotal: number; myReaction: ReactionType | null }>(`/api/posts/${prev.id}/react`, { method: "POST", json: { type } });
      applyTarget((t) => ({ ...t, ...r }));
    } catch (e) {
      applyTarget(() => prev);
      toast({ title: (e as Error).message, kind: "error" });
    }
  };
  const applyTarget = (fn: (t: FeedPost) => FeedPost) => setPost((p) => (p.isRepost && p.repostOf ? { ...p, repostOf: fn(p.repostOf) } : fn(p)));

  const bookmark = async () => {
    if (!requireAuth()) return;
    applyTarget((t) => ({ ...t, bookmarked: !t.bookmarked }));
    try {
      const r = await api<{ bookmarked: boolean }>(`/api/posts/${target.id}/bookmark`, { method: "POST" });
      applyTarget((t) => ({ ...t, bookmarked: r.bookmarked }));
      toast(r.bookmarked ? "Saved to bookmarks" : "Removed from bookmarks");
    } catch (e) {
      applyTarget((t) => ({ ...t, bookmarked: !t.bookmarked }));
      toast({ title: (e as Error).message, kind: "error" });
    }
  };
  const repost = async (quoteText?: string) => {
    if (!requireAuth()) return;
    setBusy(true);
    try {
      const r = await api<{ post?: FeedPost; toggledOff?: boolean }>(`/api/posts/${target.id}/repost`, { method: "POST", json: { quote: quoteText } });
      if (r.toggledOff) {
        applyTarget((t) => ({ ...t, repostCount: Math.max(0, t.repostCount - 1) }));
        toast("Repost removed");
      } else if (r.post) {
        applyTarget((t) => ({ ...t, repostCount: t.repostCount + 1 }));
        onNewPost?.(r.post);
        toast({ title: quoteText ? "Quote posted" : "Reposted", kind: "success" });
      }
      setQuoteOpen(false);
      setQuote("");
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    } finally {
      setBusy(false);
    }
  };
  const vote = async (optionId: string) => {
    if (!requireAuth()) return;
    try {
      const r = await api<{ poll: FeedPost["poll"] }>(`/api/posts/${target.id}/vote`, { method: "POST", json: { optionId } });
      applyTarget((t) => ({ ...t, poll: r.poll }));
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    }
  };
  const share = async () => {
    const url = `${window.location.origin}/post/${target.id}`;
    try {
      if (navigator.share) await navigator.share({ url, title: `Post by ${target.author.displayName} on Pebble` });
      else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", kind: "success" });
      }
    } catch {}
  };
  const del = async () => {
    if (!confirm("Delete this post?")) return;
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      onRemove?.(post.id);
      toast("Post deleted");
      if (detail) router.push("/home");
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    }
  };
  const removeAsMod = async () => {
    const reason = prompt("Reason shown to the author:", "Removed by moderators for violating community guidelines.");
    if (!reason) return;
    try {
      await api(`/api/posts/${post.id}?reason=${encodeURIComponent(reason)}`, { method: "DELETE" });
      onRemove?.(post.id);
      toast("Post removed and author notified");
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    }
  };
  const saveEdit = async () => {
    setBusy(true);
    try {
      const r = await api<{ post: FeedPost }>(`/api/posts/${post.id}`, { method: "PATCH", json: { text: editText } });
      setPost(() => r.post);
      setEditOpen(false);
      toast({ title: "Post updated", kind: "success" });
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    } finally {
      setBusy(false);
    }
  };
  const simple = async (url: string, msg: string) => {
    try {
      await api(url, { method: "POST" });
      toast(msg);
      onRemove?.(post.id);
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    }
  };

  const isMine = viewer?.id === post.author.id;
  const isStaff = viewer?.role === "moderator" || viewer?.role === "admin";
  const canEdit = isMine && Date.now() - new Date(post.createdAt).getTime() < site.editWindowMinutes * 60_000 && !post.deletedAt;

  // Removed / deleted state (transparent reason + appeal)
  if (post.deletedAt) {
    return (
      <article className="card p-4 text-sm text-muted" data-post-id={post.id} tabIndex={0}>
        <p className="flex items-center gap-2"><Prohibit size={18} /> {post.removedReason ? "This post was removed." : "This post was deleted."}</p>
        {post.removedReason && <p className="mt-1 rounded-xl bg-elevated p-3 text-ink">Reason: {post.removedReason}</p>}
        {post.removedReason && isMine && (
          <button className="btn-ghost mt-3 text-sm" onClick={() => setAppealOpen(true)}>Appeal this decision</button>
        )}
        <Modal open={appealOpen} onClose={() => setAppealOpen(false)} title="Appeal removal" size="sm">
          <textarea className="input min-h-28" value={appealText} onChange={(e) => setAppealText(e.target.value)} placeholder="Tell the moderators why this should be restored" />
          <button className="btn-primary mt-3" disabled={appealText.length < 5} onClick={async () => { await api(`/api/posts/${post.id}/appeal`, { method: "POST", json: { text: appealText } }); setAppealOpen(false); toast({ title: "Appeal sent", kind: "success" }); }}>Send appeal</button>
        </Modal>
      </article>
    );
  }

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="card relative p-4 outline-none focus-visible:ring-2 focus-visible:ring-violet sm:p-5"
      data-post-id={post.id}
      tabIndex={0}
      aria-label={`Post by ${target.author.displayName}`}
    >
      {post.isRepost && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Repeat size={14} weight="bold" /> <Link href={`/u/${post.author.username}`} className="hover:underline">{post.author.displayName}</Link> reposted
        </p>
      )}
      {post.discoverReason && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet" title="Why you see this in Discover">
          <Sparkle size={14} weight="fill" /> {post.discoverReason}
        </p>
      )}
      {/* Header */}
      <header className="flex items-start gap-3">
        <Link href={`/u/${target.author.username}`} aria-label={target.author.displayName}>
          <Avatar src={target.author.avatarUrl} name={target.author.displayName} size={44} online={isOnline(target.author.lastActiveAt)} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 text-[15px]">
            <Link href={`/u/${target.author.username}`} className="truncate font-semibold hover:underline">{target.author.displayName}</Link>
            <span className="truncate text-muted">@{target.author.username}</span>
            <span className="text-muted">·</span>
            <Link href={`/post/${target.id}`} className="text-muted hover:underline"><time dateTime={new Date(target.createdAt).toISOString()}>{timeAgo(target.createdAt)}</time></Link>
            {target.editedAt && <span className="text-xs text-muted">(edited)</span>}
          </div>
          {target.circle && (
            <Link href={`/circles/${target.circle.slug}`} className="pill mt-0.5 inline-block text-[11px]">in {target.circle.name}{target.circle.isPrivate ? " 🔒" : ""}</Link>
          )}
        </div>
        <div className="relative">
          <button aria-label="Post options" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-elevated">
            <DotsThree size={24} weight="bold" />
          </button>
          <AnimatePresence>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden />
                <motion.ul role="menu" initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="card absolute right-0 top-11 z-20 w-56 overflow-hidden p-1.5 text-sm" onClick={() => setMenu(false)}>
                  <MenuItem icon={<LinkIcon size={18} />} label="Copy link" onClick={share} />
                  {canEdit && <MenuItem icon={<PencilSimple size={18} />} label="Edit (15 min window)" onClick={() => { setEditText(post.text); setEditOpen(true); }} />}
                  {isMine && <MenuItem icon={<Trash size={18} />} label="Delete" danger onClick={del} />}
                  {isMine && <MenuItem icon={<PushPin size={18} />} label="Pin to profile" onClick={() => api("/api/settings", { method: "PATCH", json: { pinnedPostId: post.id } }).then(() => toast("Pinned"))} />}
                  {viewer && !isMine && (
                    <>
                      <MenuItem icon={<EyeSlash size={18} />} label="Hide this post" onClick={() => simple(`/api/posts/${post.id}/hide`, "Post hidden")} />
                      <MenuItem icon={<SpeakerSlash size={18} />} label={`Mute @${target.author.username}`} onClick={() => simple(`/api/users/${target.author.username}/mute`, "Muted")} />
                      <MenuItem icon={<Prohibit size={18} />} label={`Block @${target.author.username}`} danger onClick={() => confirm(`Block @${target.author.username}? You won't see each other's content.`) && simple(`/api/users/${target.author.username}/block`, "Blocked")} />
                      <MenuItem icon={<Flag size={18} />} label="Report" danger onClick={() => setReportTarget({ type: "post", id: target.id })} />
                    </>
                  )}
                  {isStaff && !isMine && <MenuItem icon={<Trash size={18} />} label="Remove as moderator" danger onClick={removeAsMod} />}
                </motion.ul>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Body */}
      <div className="mt-3 space-y-3">
        {target.text && <RichText text={target.text} className="text-[16px]" />}
        {target.media.length > 0 && <MediaGrid media={target.media} priority={priority} onDoubleLike={() => !target.myReaction && react("love")} />}
        {target.poll && <PollCard poll={target.poll} onVote={vote} disabled={!viewer} />}
        {target.linkPreview && !target.media.length && <LinkPreviewCard preview={target.linkPreview} />}
        {!post.isRepost && post.repostOf && (
          <Link href={`/post/${post.repostOf.id}`} className="block rounded-[20px] border border-hairline p-3 transition-colors hover:bg-elevated/60">
            <div className="flex items-center gap-2 text-sm">
              <Avatar src={post.repostOf.author.avatarUrl} name={post.repostOf.author.displayName} size={22} />
              <span className="font-semibold">{post.repostOf.author.displayName}</span>
              <span className="text-muted">@{post.repostOf.author.username} · {timeAgo(post.repostOf.createdAt)}</span>
            </div>
            {post.repostOf.deletedAt ? <p className="mt-1 text-sm text-muted">This post is no longer available.</p> : <p className="mt-1 line-clamp-4 text-sm break-anywhere">{post.repostOf.text}</p>}
            {post.repostOf.media[0] && !post.repostOf.deletedAt && <div className="mt-2 h-40 overflow-hidden rounded-xl"><img src={post.repostOf.media[0].url} alt={post.repostOf.media[0].alt} className="h-full w-full object-cover" loading="lazy" /></div>}
          </Link>
        )}
      </div>

      {/* Actions */}
      <footer className="mt-3 flex items-center justify-between gap-1 text-muted">
        <ReactionButton value={target.myReaction} total={target.reactionTotal} counts={target.reactionCounts} onChange={react} />
        <button data-action="comment" onClick={() => (detail ? document.getElementById(`comment-input-${target.id}`)?.focus() : setShowComments((s) => !s))} aria-expanded={showComments} aria-label={`${target.commentCount} comments`} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold hover:bg-elevated hover:text-ink">
          <ChatCircle size={22} weight="duotone" /> {target.commentCount}
        </button>
        <div className="relative">
          <button onClick={() => (viewer ? setQuoteOpen(true) : router.push("/login"))} aria-label={`${target.repostCount} reposts`} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold hover:bg-elevated hover:text-mint">
            <Repeat size={22} weight="duotone" /> {target.repostCount}
          </button>
        </div>
        <button onClick={bookmark} aria-pressed={target.bookmarked} aria-label="Bookmark" className={cn("flex min-h-11 items-center rounded-full px-3 hover:bg-elevated", target.bookmarked && "text-violet")}>
          <motion.span animate={target.bookmarked ? { scale: [1, 1.3, 1] } : {}}><BookmarkSimple size={22} weight={target.bookmarked ? "fill" : "duotone"} /></motion.span>
        </button>
        <button onClick={share} aria-label="Share" className="flex min-h-11 items-center rounded-full px-3 hover:bg-elevated hover:text-ink">
          <ShareNetwork size={22} weight="duotone" />
        </button>
      </footer>

      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <CommentThread postId={target.id} onCount={(n) => applyTarget((t) => ({ ...t, commentCount: n }))} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Repost / quote sheet */}
      <Modal open={quoteOpen} onClose={() => setQuoteOpen(false)} title="Repost" size="sm">
        <div className="space-y-3">
          <button className="btn-ghost flex w-full items-center gap-2" disabled={busy} onClick={() => repost()}><Repeat size={18} /> Repost to your followers</button>
          <div className="rounded-2xl border border-hairline p-3">
            <label className="mb-1 flex items-center gap-1 text-sm font-semibold"><Quotes size={16} /> Add a quote</label>
            <textarea className="input min-h-20" value={quote} onChange={(e) => setQuote(e.target.value.slice(0, 500))} placeholder="Say something about this…" />
            <div className="mt-2 flex items-center justify-between text-xs text-muted"><span>{quote.length}/500</span><button className="btn-primary" disabled={!quote.trim() || busy} onClick={() => repost(quote)}>Post quote</button></div>
          </div>
        </div>
      </Modal>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit post" size="sm">
        <textarea className="input min-h-32" value={editText} maxLength={site.postMaxLength} onChange={(e) => setEditText(e.target.value)} />
        <div className="mt-2 flex items-center justify-between text-xs text-muted"><span>{editText.length}/{site.postMaxLength}</span><button className="btn-primary" disabled={busy || !editText.trim()} onClick={saveEdit}>Save</button></div>
      </Modal>
    </motion.article>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <li role="none">
      <button role="menuitem" onClick={onClick} className={cn("flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left hover:bg-elevated", danger && "text-coral-deep dark:text-coral")}>
        {icon} {label}
      </button>
    </li>
  );
}
