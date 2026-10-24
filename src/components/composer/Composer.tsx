"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { Image as ImageIcon, ListBullets, X, Plus, Clock } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { useViewer } from "@/components/providers";
import { useComposerStore } from "@/store/useComposerStore";
import { useUiStore, toast } from "@/store/useUiStore";
import { api } from "@/lib/client";
import { site } from "@/config/site";
import type { FeedPost } from "@/lib/feed";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

type Props = { onPosted: (p: FeedPost) => void; circleId?: string | null; inline?: boolean };

/** Expanding composer: text with live ring counter, up to 4 image URLs with alt text, polls, @mention autocomplete, scheduling. */
export function Composer({ onPosted, circleId = null, inline = true }: Props) {
  const viewer = useViewer();
  const s = useComposerStore();
  const composerOpen = useUiStore((x) => x.composerOpen);
  const setComposerOpen = useUiStore((x) => x.setComposerOpen);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const [showImg, setShowImg] = useState(false);
  const [schedule, setSchedule] = useState("");
  const [mentionQ, setMentionQ] = useState<string | null>(null);
  const [mentions, setMentions] = useState<{ username: string; displayName: string; avatarUrl: string }[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const open = inline ? expanded : composerOpen;

  useEffect(() => {
    if (!inline && composerOpen) setTimeout(() => taRef.current?.focus(), 80);
  }, [composerOpen, inline]);

  useEffect(() => {
    if (mentionQ === null || mentionQ.length < 1) return setMentions([]);
    const t = setTimeout(() => api<{ users: typeof mentions }>(`/api/users/mention?q=${encodeURIComponent(mentionQ)}`).then((r) => setMentions(r.users)).catch(() => {}), 150);
    return () => clearTimeout(t);
  }, [mentionQ]);

  if (!viewer) return null;
  const len = s.text.length;
  const ratio = Math.min(1, len / site.postMaxLength);
  const over = len > site.postMaxLength;
  const ringColor = over ? "#F0445A" : ratio > 0.9 ? "#FF5E6C" : "#7B5CFF";

  const onText = (v: string) => {
    s.set({ text: v });
    const m = v.slice(0, taRef.current?.selectionStart ?? v.length).match(/(?:^|\s)@([a-z0-9_]{1,24})$/i);
    setMentionQ(m ? m[1] : null);
  };
  const pickMention = (username: string) => {
    const pos = taRef.current?.selectionStart ?? s.text.length;
    const before = s.text.slice(0, pos).replace(/@([a-z0-9_]{1,24})$/i, `@${username} `);
    s.set({ text: before + s.text.slice(pos) });
    setMentionQ(null);
    taRef.current?.focus();
  };
  const addImage = () => {
    if (!imgUrl.trim() || s.media.length >= 4) return;
    s.set({ media: [...s.media, { url: imgUrl.trim(), alt: "" }] });
    setImgUrl("");
  };
  const reset = () => {
    s.reset();
    setSchedule("");
    setShowImg(false);
    setExpanded(false);
    setComposerOpen(false);
  };
  const publish = async () => {
    if (over) return;
    setBusy(true);
    try {
      const r = await api<{ post: FeedPost }>("/api/posts", {
        method: "POST",
        json: { text: s.text, media: s.media, poll: s.poll && s.poll.options.filter((o) => o.trim()).length >= 2 ? { ...s.poll, options: s.poll.options.filter((o) => o.trim()) } : null, circleId, scheduledAt: schedule ? new Date(schedule).toISOString() : null },
      });
      if (schedule) toast({ title: "Scheduled — it will publish automatically", kind: "success" });
      else onPosted(r.post);
      reset();
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <motion.div layout className={cn("card p-3 sm:p-4", !inline && "border-0 shadow-none")} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
      <div className="flex gap-3">
        <Avatar src={viewer.avatarUrl} name={viewer.displayName} size={44} />
        <div className="min-w-0 flex-1">
          {!open ? (
            <button onClick={() => { setExpanded(true); setTimeout(() => taRef.current?.focus(), 50); }} className="flex min-h-11 w-full items-center rounded-full bg-elevated px-4 text-left text-muted transition-colors hover:bg-hairline/60">
              What's on your mind, {viewer.displayName.split(" ")[0]}?
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <textarea ref={taRef} value={s.text} onChange={(e) => onText(e.target.value)} placeholder="Share a small moment…" rows={3} className="w-full resize-none bg-transparent text-[17px] leading-[1.55] outline-none placeholder:text-muted" aria-label="Post text" aria-describedby="char-count" />
                <AnimatePresence>
                  {mentions.length > 0 && (
                    <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card absolute left-0 top-full z-20 w-64 p-1" role="listbox">
                      {mentions.map((m) => (
                        <li key={m.username}><button type="button" onClick={() => pickMention(m.username)} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-sm hover:bg-elevated"><Avatar src={m.avatarUrl} name={m.displayName} size={28} /><span className="font-semibold">{m.displayName}</span><span className="text-muted">@{m.username}</span></button></li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {s.media.length > 0 && (
                  <Reorder.Group axis="x" values={s.media} onReorder={(media) => s.set({ media })} className="flex gap-2 overflow-x-auto no-scrollbar">
                    {s.media.map((m, i) => (
                      <Reorder.Item key={m.url} value={m} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="relative w-36 shrink-0 cursor-grab">
                        <img src={m.url} alt={m.alt} className="h-28 w-36 rounded-2xl object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.3")} />
                        <button type="button" aria-label="Remove image" onClick={() => s.set({ media: s.media.filter((_, j) => j !== i) })} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"><X size={14} /></button>
                        <input value={m.alt} onChange={(e) => s.set({ media: s.media.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)) })} placeholder="Alt text (please!)" className="input mt-1 min-h-8 px-2 py-1 text-xs" aria-label={`Alt text for image ${i + 1}`} />
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </AnimatePresence>
              {showImg && s.media.length < 4 && (
                <div className="flex gap-2">
                  <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="Paste an image URL (https://…)" className="input" aria-label="Image URL" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImage())} />
                  <button type="button" className="btn-ghost" onClick={addImage}><Plus size={18} /></button>
                </div>
              )}
              <AnimatePresence>
                {s.poll && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden rounded-2xl border border-hairline p-3">
                    {s.poll.options.map((o, i) => (
                      <motion.div key={i} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                        <input value={o} maxLength={60} onChange={(e) => s.set({ poll: { ...s.poll!, options: s.poll!.options.map((x, j) => (j === i ? e.target.value : x)) } })} placeholder={`Option ${i + 1}`} className="input" aria-label={`Poll option ${i + 1}`} />
                        {s.poll!.options.length > 2 && <button type="button" aria-label="Remove option" className="btn-ghost px-3" onClick={() => s.set({ poll: { ...s.poll!, options: s.poll!.options.filter((_, j) => j !== i) } })}><X size={16} /></button>}
                      </motion.div>
                    ))}
                    <div className="flex items-center justify-between text-sm">
                      {s.poll.options.length < 4 ? <button type="button" className="font-semibold text-violet" onClick={() => s.set({ poll: { ...s.poll!, options: [...s.poll!.options, ""] } })}>+ Add option</button> : <span />}
                      <label className="flex items-center gap-2 text-muted">Duration
                        <select className="input min-h-9 w-auto py-1" value={s.poll.durationHours} onChange={(e) => s.set({ poll: { ...s.poll!, durationHours: Number(e.target.value) } })}>
                          <option value={1}>1 hour</option><option value={6}>6 hours</option><option value={24}>1 day</option><option value={72}>3 days</option><option value={168}>1 week</option>
                        </select>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {schedule && <p className="flex items-center gap-1 text-xs text-muted"><Clock size={14} /> Scheduled for {new Date(schedule).toLocaleString()}</p>}
              <div className="flex items-center justify-between gap-2 border-t border-hairline pt-3">
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Add image" aria-pressed={showImg} onClick={() => setShowImg((v) => !v)} className={cn("flex h-11 w-11 items-center justify-center rounded-full text-violet hover:bg-lilac/60 dark:hover:bg-violet/20", showImg && "bg-lilac/60 dark:bg-violet/20")}><ImageIcon size={22} weight="duotone" /></button>
                  <button type="button" aria-label="Add poll" aria-pressed={!!s.poll} onClick={() => s.set({ poll: s.poll ? null : { options: ["", ""], durationHours: 24 } })} className={cn("flex h-11 w-11 items-center justify-center rounded-full text-violet hover:bg-lilac/60 dark:hover:bg-violet/20", s.poll && "bg-lilac/60 dark:bg-violet/20")}><ListBullets size={22} weight="duotone" /></button>
                  <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-violet hover:bg-lilac/60 dark:hover:bg-violet/20" aria-label="Schedule">
                    <Clock size={22} weight="duotone" />
                    <input type="datetime-local" className="sr-only" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <span id="char-count" className="relative h-7 w-7" aria-label={`${len} of ${site.postMaxLength} characters`}>
                    <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--p-hairline)" strokeWidth="3" /><motion.circle cx="18" cy="18" r="15" fill="none" stroke={ringColor} strokeWidth="3" strokeLinecap="round" strokeDasharray="94.2" animate={{ strokeDashoffset: 94.2 * (1 - ratio) }} /></svg>
                    {ratio > 0.8 && <span className={cn("absolute inset-0 flex items-center justify-center text-[9px] font-bold", over ? "text-error" : "text-coral-deep")}>{site.postMaxLength - len}</span>}
                  </span>
                  <button type="button" className="btn-ghost" onClick={reset}>Cancel</button>
                  <motion.button whileTap={{ scale: 0.96 }} className="btn-primary" disabled={busy || over || (!s.text.trim() && !s.media.length && !s.poll)} onClick={publish}>{busy ? "Posting…" : schedule ? "Schedule" : "Post"}</motion.button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (inline) return body;
  return (
    <Modal open={composerOpen} onClose={() => setComposerOpen(false)} title="New post" size="md">
      {body}
    </Modal>
  );
}
