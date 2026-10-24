"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X, Eye } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { useViewer } from "@/components/providers";
import { api } from "@/lib/client";
import { toast } from "@/store/useUiStore";
import { cn, timeAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

type StoryItem = { id: string; type: string; imageUrl: string | null; text: string | null; bgStyle: string; createdAt: string; expiresAt: string; seen: boolean };
type Group = { author: { id: string; username: string; displayName: string; avatarUrl: string; lastActiveAt: string }; stories: StoryItem[]; allSeen: boolean };

const BG: Record<string, string> = {
  sunset: "linear-gradient(135deg,#FFA877,#FF5E6C 40%,#E83E9B 70%,#7B5CFF)",
  ocean: "linear-gradient(135deg,#5CC8FF,#7B5CFF)",
  mint: "linear-gradient(135deg,#3DDBB0,#5CC8FF)",
  plum: "linear-gradient(135deg,#2A1722,#7B5CFF)",
};
const DURATION = 5000;

export function StoriesRow() {
  const viewer = useViewer();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [compose, setCompose] = useState(false);
  const load = useCallback(() => api<{ groups: Group[] }>("/api/stories").then((r) => setGroups(r.groups)).catch(() => setGroups([])), []);
  useEffect(() => {
    load();
  }, [load]);
  if (!viewer) return null;
  const mine = groups?.find((g) => g.author.id === viewer.id);
  return (
    <section aria-label="Stories" className="card p-3">
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        <button onClick={() => (mine ? setOpen(groups!.indexOf(mine)) : setCompose(true))} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-xs">
          <span className="relative">
            <Avatar src={viewer.avatarUrl} name={viewer.displayName} size={60} ring={mine ? (mine.allSeen ? "seen" : "unseen") : null} />
            <span onClick={(e) => { e.stopPropagation(); setCompose(true); }} role="button" aria-label="Add a story" className="sunset absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface text-white"><Plus size={12} weight="bold" /></span>
          </span>
          <span className="truncate font-medium">Your story</span>
        </button>
        {!groups && Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"><Skeleton className="h-[66px] w-[66px] rounded-full" /><Skeleton className="h-3 w-12" /></div>)}
        {groups?.filter((g) => g.author.id !== viewer.id).map((g) => {
          const idx = groups.indexOf(g);
          return (
            <motion.button key={g.author.id} whileTap={{ scale: 0.92 }} onClick={() => setOpen(idx)} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-xs" aria-label={`${g.author.displayName}'s story${g.allSeen ? " (seen)" : ""}`}>
              <Avatar src={g.author.avatarUrl} name={g.author.displayName} size={60} ring={g.allSeen ? "seen" : "unseen"} />
              <span className="w-full truncate font-medium">{g.author.displayName.split(" ")[0]}</span>
            </motion.button>
          );
        })}
        {groups && groups.length === 0 && <p className="self-center font-accent text-lg text-muted">No stories yet — add the first one ✨</p>}
      </div>
      {groups && open !== null && <StoryViewer groups={groups} start={open} onClose={() => { setOpen(null); load(); }} />}
      <StoryComposer open={compose} onClose={() => setCompose(false)} onCreated={load} />
    </section>
  );
}

/** Full-screen viewer: progress bars, tap/keys to advance, swipe down to close, cube-style transition between authors. */
function StoryViewer({ groups, start, onClose }: { groups: Group[]; start: number; onClose: () => void }) {
  const viewer = useViewer();
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(() => Math.max(0, groups[start].stories.findIndex((s) => !s.seen)));
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [expired, setExpired] = useState(false);
  const [viewers, setViewers] = useState<{ id: string; displayName: string; avatarUrl: string; username: string }[] | null>(null);
  const raf = useRef(0);
  const startTs = useRef(0);
  const group = groups[gi];
  const story = group.stories[si];
  const isMine = viewer?.id === group.author.id;

  const next = useCallback(() => {
    setViewers(null);
    if (si + 1 < group.stories.length) setSi(si + 1);
    else if (gi + 1 < groups.length) {
      setGi(gi + 1);
      setSi(0);
    } else onClose();
  }, [si, gi, group.stories.length, groups.length, onClose]);
  const prev = () => {
    setViewers(null);
    if (si > 0) setSi(si - 1);
    else if (gi > 0) {
      setGi(gi - 1);
      setSi(groups[gi - 1].stories.length - 1);
    }
  };

  // Mark viewed + detect expiry (story may expire while open)
  useEffect(() => {
    setExpired(false);
    api(`/api/stories/${story.id}/view`, { method: "POST" }).catch((e) => {
      if ((e as Error).message.includes("expired") || new Date(story.expiresAt) < new Date()) setExpired(true);
    });
  }, [story.id, story.expiresAt]);

  // Timer
  useEffect(() => {
    startTs.current = performance.now() - progress * DURATION;
    const tick = (t: number) => {
      if (!paused) {
        const p = (t - startTs.current) / DURATION;
        if (p >= 1) return next();
        setProgress(p);
      } else startTs.current = t - progress * DURATION;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id, paused, next]);
  useEffect(() => setProgress(0), [story.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onClose();
      if (e.key === " ") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next]);

  return (
    <motion.div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`Story by ${group.author.displayName}`}>
      <motion.div
        key={gi}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.6}
        onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
        initial={{ rotateY: 60, opacity: 0, scale: 0.9 }}
        animate={{ rotateY: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        style={{ transformPerspective: 1000, background: story.type === "text" ? BG[story.bgStyle] ?? BG.sunset : "#000" }}
        className="relative h-[100dvh] w-full max-w-[460px] overflow-hidden sm:h-[88dvh] sm:rounded-[28px]"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
      >
        {/* progress */}
        <div className="absolute inset-x-3 top-3 z-20 flex gap-1" aria-hidden>
          {group.stories.map((s, i) => (
            <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <span className="block h-full bg-white" style={{ width: i < si ? "100%" : i === si ? `${progress * 100}%` : "0%" }} />
            </span>
          ))}
        </div>
        <div className="absolute inset-x-3 top-7 z-20 flex items-center gap-2 text-white">
          <Avatar src={group.author.avatarUrl} name={group.author.displayName} size={36} />
          <span className="font-semibold">{group.author.displayName}</span>
          <span className="text-sm text-white/70">{timeAgo(story.createdAt)}</span>
          <button onClick={onClose} aria-label="Close" className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/30"><X size={22} /></button>
        </div>
        {expired ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-white"><p className="font-accent text-3xl">This story has expired</p><button className="btn-ghost" onClick={next}>Continue</button></div>
        ) : story.type === "image" && story.imageUrl ? (
          <img src={story.imageUrl} alt={story.text ?? "Story image"} className="h-full w-full object-cover" draggable={false} />
        ) : null}
        {story.text && !expired && (
          <p className={cn("absolute inset-x-6 z-10 text-center font-accent text-3xl text-white drop-shadow-lg", story.type === "image" ? "bottom-20" : "top-1/2 -translate-y-1/2 text-4xl")}>{story.text}</p>
        )}
        {/* tap zones */}
        <button className="absolute inset-y-0 left-0 z-10 w-1/3" aria-label="Previous" onClick={prev} />
        <button className="absolute inset-y-0 right-0 z-10 w-2/3" aria-label="Next" onClick={next} />
        {isMine && (
          <div className="absolute inset-x-0 bottom-0 z-20 p-4">
            <button onClick={() => api<{ viewers: typeof viewers }>(`/api/stories/${story.id}/view`).then((r) => setViewers(r.viewers ?? []))} className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-2 text-sm font-semibold text-white"><Eye size={18} /> Viewers</button>
            <AnimatePresence>
              {viewers && (
                <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="card mt-2 max-h-56 overflow-y-auto p-3 text-sm">
                  {viewers.length === 0 ? <p className="text-muted">No views yet</p> : viewers.map((v) => <div key={v.id} className="flex items-center gap-2 py-1"><Avatar src={v.avatarUrl} name={v.displayName} size={28} /><span className="font-semibold">{v.displayName}</span><span className="text-muted">@{v.username}</span></div>)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StoryComposer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<"image" | "text">("text");
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [bg, setBg] = useState("sunset");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api("/api/stories", { method: "POST", json: { type, text: text || undefined, imageUrl: type === "image" ? imageUrl : undefined, bgStyle: bg } });
      toast({ title: "Story added — it disappears in 24h", kind: "success" });
      onCreated();
      onClose();
      setText("");
      setImageUrl("");
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a story" size="sm">
      <div className="mb-3 flex gap-2">
        {(["text", "image"] as const).map((t) => <button key={t} onClick={() => setType(t)} className={cn("pill min-h-10 flex-1 capitalize", type === t && "sunset text-white")}>{t}</button>)}
      </div>
      <div className="relative mb-3 flex aspect-[9/14] max-h-72 w-full items-center justify-center overflow-hidden rounded-2xl" style={{ background: type === "text" ? BG[bg] : "#111" }}>
        {type === "image" && imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <p className="relative px-6 text-center font-accent text-3xl text-white drop-shadow">{text || "Your words here"}</p>
      </div>
      {type === "text" && <div className="mb-3 flex gap-2">{Object.keys(BG).map((k) => <button key={k} aria-label={k} onClick={() => setBg(k)} className={cn("h-9 w-9 rounded-full border-2", bg === k ? "border-ink" : "border-transparent")} style={{ background: BG[k] }} />)}</div>}
      {type === "image" && <input className="input mb-2" placeholder="Image URL (https://…)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />}
      <input className="input" placeholder={type === "text" ? "Say something (140 chars)" : "Caption (optional)"} maxLength={140} value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn-primary mt-3 w-full" disabled={busy || (type === "text" ? !text.trim() : !imageUrl.trim())} onClick={submit}>{busy ? "Posting…" : "Share story"}</button>
    </Modal>
  );
}
