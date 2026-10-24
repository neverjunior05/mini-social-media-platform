"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Flag, Trash } from "@phosphor-icons/react";
import type { CommentDto } from "@/lib/comments";
import { Avatar } from "@/components/ui/Avatar";
import { RichText } from "@/components/post/RichText";
import { useViewer } from "@/components/providers";
import { useUiStore, toast } from "@/store/useUiStore";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

/** Two-level comment thread: top-level comments and their replies. New comments arrive with a soft highlight. */
export function CommentThread({ postId, onCount }: { postId: string; onCount?: (n: number) => void }) {
  const viewer = useViewer();
  const setReportTarget = useUiStore((s) => s.setReportTarget);
  const [comments, setComments] = useState<CommentDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    api<{ comments: CommentDto[] }>(`/api/posts/${postId}/comments`)
      .then((r) => setComments(r.comments))
      .catch((e) => setError((e as Error).message));
  }, [postId]);

  const tree = useMemo(() => {
    const top = (comments ?? []).filter((c) => !c.parentId);
    return top.map((c) => ({ ...c, replies: (comments ?? []).filter((r) => r.parentId === c.id) }));
  }, [comments]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !viewer) return;
    setBusy(true);
    try {
      const r = await api<{ comment: CommentDto }>(`/api/posts/${postId}/comments`, { method: "POST", json: { text, parentId: replyTo?.id ?? null } });
      setComments((cs) => {
        const next = [...(cs ?? []), r.comment];
        onCount?.(next.filter((c) => !c.deleted).length);
        return next;
      });
      setFresh((f) => new Set(f).add(r.comment.id));
      setText("");
      setReplyTo(null);
    } catch (err) {
      toast({ title: (err as Error).message, kind: "error" });
    } finally {
      setBusy(false);
    }
  };
  const del = async (id: string) => {
    try {
      await api(`/api/posts/${postId}/comments?commentId=${id}`, { method: "DELETE" });
      setComments((cs) => {
        const next = (cs ?? []).map((c) => (c.id === id ? { ...c, deleted: true, text: "" } : c));
        onCount?.(next.filter((c) => !c.deleted).length);
        return next;
      });
    } catch (err) {
      toast({ title: (err as Error).message, kind: "error" });
    }
  };

  const Item = ({ c, isReply }: { c: CommentDto; isReply?: boolean }) => (
    <motion.li layout initial={{ opacity: 0, x: isReply ? 12 : 0, y: isReply ? 0 : 8 }} animate={{ opacity: 1, x: 0, y: 0 }} className={`relative flex gap-2.5 rounded-2xl p-2 transition-colors ${fresh.has(c.id) ? "bg-peach/20" : ""}`}>
      <Link href={`/u/${c.author.username}`}><Avatar src={c.author.avatarUrl} name={c.author.displayName} size={isReply ? 28 : 34} /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
          <Link href={`/u/${c.author.username}`} className="font-semibold hover:underline">{c.author.displayName}</Link>
          <span className="text-xs text-muted">@{c.author.username} · {timeAgo(c.createdAt)}</span>
        </div>
        {c.deleted ? <p className="text-sm italic text-muted">Comment deleted</p> : <RichText text={c.text} className="text-[15px]" />}
        {viewer && !c.deleted && (
          <div className="mt-1 flex gap-3 text-xs font-semibold text-muted">
            <button onClick={() => setReplyTo(c)} className="min-h-8 hover:text-ink">Reply</button>
            {(viewer.id === c.author.id || viewer.role !== "member") && <button onClick={() => del(c.id)} className="flex min-h-8 items-center gap-1 hover:text-coral-deep"><Trash size={13} /> Delete</button>}
            {viewer.id !== c.author.id && <button onClick={() => setReportTarget({ type: "comment", id: c.id })} className="flex min-h-8 items-center gap-1 hover:text-coral-deep"><Flag size={13} /> Report</button>}
          </div>
        )}
      </div>
    </motion.li>
  );

  return (
    <section className="mt-3 border-t border-hairline pt-3" aria-label="Comments">
      {error && <p className="text-sm text-error">{error}</p>}
      {!comments && !error && <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-3/4" /></div>}
      {comments && comments.length === 0 && <p className="font-accent text-lg text-muted">No comments yet — be the first kind voice.</p>}
      <ul className="space-y-1">
        <AnimatePresence initial={false}>
          {tree.map((c) => (
            <li key={c.id}>
              <ul><Item c={c} /></ul>
              {c.replies.length > 0 && (
                <div className="relative ml-5 pl-4">
                  <motion.span className="absolute left-0 top-0 w-px bg-hairline" initial={{ height: 0 }} animate={{ height: "100%" }} transition={{ duration: 0.5 }} aria-hidden />
                  <ul className="space-y-1">{c.replies.map((r) => <Item key={r.id} c={r} isReply />)}</ul>
                </div>
              )}
            </li>
          ))}
        </AnimatePresence>
      </ul>
      {viewer ? (
        <form onSubmit={submit} className="mt-3 flex items-start gap-2">
          <Avatar src={viewer.avatarUrl} name={viewer.displayName} size={34} />
          <div className="flex-1">
            {replyTo && (
              <p className="mb-1 flex items-center gap-2 text-xs text-muted">Replying to @{replyTo.author.username} <button type="button" onClick={() => setReplyTo(null)} className="underline">cancel</button></p>
            )}
            <div className="flex gap-2">
              <input id={`comment-input-${postId}`} className="input" placeholder={replyTo ? "Write a reply…" : "Add a comment…"} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} aria-label="Comment" />
              <button className="btn-primary" disabled={busy || !text.trim()}>Post</button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted"><Link href="/login" className="font-semibold text-coral-deep">Sign in</Link> to join the conversation.</p>
      )}
    </section>
  );
}
