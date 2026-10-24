"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, PaperPlaneTilt, Image as ImageIcon, Flag, WifiSlash } from "@phosphor-icons/react";
import type { MessageDto } from "@/lib/chat";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/client";
import { useViewer } from "@/components/providers";
import { onRealtime } from "@/hooks/useRealtime";
import { useUiStore, toast } from "@/store/useUiStore";
import { cn, timeAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

type Member = { id: string; username: string; displayName: string; avatarUrl: string; lastActiveAt: string; lastReadAt: string };
type Conv = { id: string; isGroup: boolean; name: string | null };
type LocalMsg = MessageDto & { status?: "sending" | "failed" | "queued" };
const QUICK = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

/** Real-time chat: SSE delivery, optimistic bubbles, typing dots, read receipts, reactions, offline queue with retry. */
export function ChatWindow({ conversationId }: { conversationId: string }) {
  const viewer = useViewer();
  const setReportTarget = useUiStore((s) => s.setReportTarget);
  const setUnread = useUiStore((s) => s.setUnread);
  const [conv, setConv] = useState<Conv | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [msgs, setMsgs] = useState<LocalMsg[]>([]);
  const [typing, setTyping] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [img, setImg] = useState("");
  const [showImg, setShowImg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTyping = useRef(0);
  const queue = useRef<LocalMsg[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await api<{ conversation: Conv; members: Member[]; messages: MessageDto[]; typing: string[]; blockedIds: string[] }>(`/api/messages/${conversationId}`);
      setConv(r.conversation);
      setMembers(r.members);
      setMsgs((prev) => {
        const pending = prev.filter((m) => m.status && !r.messages.some((x) => x.clientId && x.clientId === m.clientId));
        return [...r.messages, ...pending];
      });
      setTyping(r.typing);
      setBlockedIds(r.blockedIds);
      api(`/api/messages/${conversationId}/read`, { method: "POST" }).then(() => api<{ conversations: { unread: number }[] }>("/api/messages").then((x) => setUnread({ messages: x.conversations.reduce((s, c) => s + c.unread, 0) })));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [conversationId, setUnread]);

  useEffect(() => {
    load();
    const poll = setInterval(() => api<{ typing: string[]; members: Member[] }>(`/api/messages/${conversationId}?since=${new Date(Date.now() + 1).toISOString()}`).then((r) => { setTyping(r.typing); setMembers(r.members); }).catch(() => {}), 3000);
    const off = onRealtime((ev) => {
      if (ev.type === "message" && ev.conversationId === conversationId) {
        const m = ev.message as MessageDto;
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        api(`/api/messages/${conversationId}/read`, { method: "POST" }).catch(() => {});
      }
    });
    const on = () => { setOnline(true); flush(); };
    const offline = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", offline);
    setOnline(navigator.onLine);
    return () => { clearInterval(poll); off(); window.removeEventListener("online", on); window.removeEventListener("offline", offline); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs.length, typing.length]);

  const sendOne = async (m: LocalMsg) => {
    try {
      const r = await api<{ message: MessageDto }>(`/api/messages/${conversationId}`, { method: "POST", json: { text: m.text, imageUrl: m.imageUrl, clientId: m.clientId } });
      setMsgs((prev) => prev.map((x) => (x.clientId === m.clientId ? { ...r.message, status: undefined } : x)));
    } catch (e) {
      setMsgs((prev) => prev.map((x) => (x.clientId === m.clientId ? { ...x, status: "failed" } : x)));
      toast({ title: (e as Error).message, kind: "error" });
    }
  };
  const flush = () => {
    const q = queue.current.splice(0);
    q.forEach((m) => { setMsgs((prev) => prev.map((x) => (x.clientId === m.clientId ? { ...x, status: "sending" } : x))); sendOne(m); });
  };
  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!text.trim() && !img.trim()) || !viewer) return;
    const local: LocalMsg = { id: `local-${Date.now()}`, conversationId, senderId: viewer.id, text: text.trim(), imageUrl: img.trim() || null, clientId: `${viewer.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date(), reactions: [], status: navigator.onLine ? "sending" : "queued" };
    setMsgs((prev) => [...prev, local]);
    setText("");
    setImg("");
    setShowImg(false);
    if (!navigator.onLine) queue.current.push(local);
    else sendOne(local);
  };
  const onType = (v: string) => {
    setText(v);
    if (Date.now() - lastTyping.current > 2000) {
      lastTyping.current = Date.now();
      api(`/api/messages/${conversationId}/typing`, { method: "POST" }).catch(() => {});
    }
  };
  const react = async (messageId: string, emoji: string | null) => {
    setReactFor(null);
    setMsgs((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions: [...m.reactions.filter((r) => r.userId !== viewer?.id), ...(emoji ? [{ userId: viewer!.id, emoji }] : [])] } : m)));
    await api(`/api/messages/${conversationId}/react`, { method: "POST", json: { messageId, emoji } }).catch(() => {});
  };

  const others = members.filter((m) => m.id !== viewer?.id);
  const title = conv?.isGroup ? conv.name ?? others.map((o) => o.displayName.split(" ")[0]).join(", ") : others[0]?.displayName ?? "Chat";
  const typingNames = typing.map((id) => members.find((m) => m.id === id)?.displayName.split(" ")[0]).filter(Boolean);
  const blocked = blockedIds.length > 0 && !conv?.isGroup;

  return (
    <div className="flex h-[calc(100dvh-140px)] flex-col md:h-[calc(100dvh-64px)]">
      <header className="card mb-3 flex items-center gap-3 p-3">
        <Link href="/messages" aria-label="Back to messages" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-elevated"><ArrowLeft size={20} /></Link>
        {others[0] && !conv?.isGroup ? <Avatar src={others[0].avatarUrl} name={others[0].displayName} size={40} online={Date.now() - new Date(others[0].lastActiveAt).getTime() < 5 * 60_000} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lilac text-violet">👥</span>}
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{conv ? title : <Skeleton className="h-4 w-32" />}</p><p className="text-xs text-muted">{conv?.isGroup ? `${members.length} members` : others[0] && Date.now() - new Date(others[0].lastActiveAt).getTime() < 5 * 60_000 ? "Online" : others[0] ? `Active ${timeAgo(others[0].lastActiveAt)} ago` : ""}</p></div>
        {!online && <span className="flex items-center gap-1 rounded-full bg-warning/20 px-2 py-1 text-xs font-semibold"><WifiSlash size={14} /> Offline — messages will send later</span>}
        {others[0] && <button aria-label="Report conversation" onClick={() => setReportTarget({ type: "user", id: others[0].id })} className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-elevated"><Flag size={18} /></button>}
      </header>
      <div className="card flex-1 overflow-y-auto p-3" role="log" aria-live="polite" aria-label="Messages">
        {error && <p className="text-center text-sm text-error">{error}</p>}
        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => {
              const mine = m.senderId === viewer?.id;
              const sender = members.find((x) => x.id === m.senderId);
              const prev = msgs[i - 1];
              const showAvatar = !mine && (!prev || prev.senderId !== m.senderId);
              const readBy = mine ? others.filter((o) => new Date(o.lastReadAt) >= new Date(m.createdAt)) : [];
              const isLastMine = mine && !msgs.slice(i + 1).some((x) => x.senderId === viewer?.id);
              return (
                <motion.li key={m.id} initial={{ opacity: 0, scale: 0.9, x: mine ? 20 : -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                  {!mine && <span className="w-7">{showAvatar && sender && <Avatar src={sender.avatarUrl} name={sender.displayName} size={28} />}</span>}
                  <div className={cn("relative max-w-[78%]", mine ? "items-end" : "items-start")}>
                    {conv?.isGroup && showAvatar && sender && <p className="mb-0.5 px-1 text-[11px] font-semibold text-muted">{sender.displayName}</p>}
                    <button onDoubleClick={() => setReactFor(m.id)} onContextMenu={(e) => { e.preventDefault(); setReactFor(m.id); }} className={cn("block rounded-[20px] px-3.5 py-2 text-left text-[15px] leading-snug break-anywhere", mine ? "sunset text-white" : "bg-elevated text-ink", m.status === "failed" && "opacity-60")} aria-label={`${mine ? "You" : sender?.displayName}: ${m.text}`}>
                      {m.imageUrl && <img src={m.imageUrl} alt="" className="mb-1 max-h-60 rounded-xl" loading="lazy" />}
                      {m.text}
                    </button>
                    {m.reactions.length > 0 && (
                      <motion.div initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn("absolute -bottom-3 flex gap-0.5 rounded-full border border-hairline bg-surface px-1.5 text-xs shadow-sm", mine ? "right-2" : "left-2")}>{[...new Set(m.reactions.map((r) => r.emoji))].map((e) => <span key={e}>{e}</span>)}</motion.div>
                    )}
                    <AnimatePresence>
                      {reactFor === m.id && (
                        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className={cn("glass absolute -top-12 z-10 flex gap-1 rounded-full p-1", mine ? "right-0" : "left-0")} role="menu">
                          {QUICK.map((e) => <button key={e} onClick={() => react(m.id, e)} className="flex h-10 w-10 items-center justify-center rounded-full text-xl hover:bg-elevated">{e}</button>)}
                          <button onClick={() => react(m.id, null)} className="px-2 text-xs text-muted">none</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <p className={cn("mt-0.5 px-1 text-[10px] text-muted", mine && "text-right")}>
                      {m.status === "sending" ? "Sending…" : m.status === "queued" ? "Queued (offline)" : m.status === "failed" ? <button className="text-error underline" onClick={() => { queue.current.push(m); flush(); }}>Failed · retry</button> : timeAgo(m.createdAt)}
                    </p>
                    {isLastMine && readBy.length > 0 && !m.status && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end -space-x-1" aria-label={`Seen by ${readBy.map((r) => r.displayName).join(", ")}`}>{readBy.slice(0, 4).map((r) => <Avatar key={r.id} src={r.avatarUrl} name={r.displayName} size={14} />)}</motion.div>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {typingNames.length > 0 && (
            <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 pl-9 text-xs text-muted">
              <span className="flex gap-0.5 rounded-full bg-elevated px-3 py-2">{[0, 1, 2].map((i) => <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />)}</span>
              {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing
            </motion.li>
          )}
        </ul>
        <div ref={bottomRef} />
      </div>
      {blocked ? (
        <p className="card mt-3 p-3 text-center text-sm text-muted">You can't message this person.</p>
      ) : (
        <form onSubmit={send} className="card mt-3 space-y-2 p-2">
          {showImg && <input className="input" placeholder="Image URL (https://…)" value={img} onChange={(e) => setImg(e.target.value)} aria-label="Image URL" />}
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Attach image URL" aria-pressed={showImg} onClick={() => setShowImg((v) => !v)} className="flex h-11 w-11 items-center justify-center rounded-full text-violet hover:bg-elevated"><ImageIcon size={22} weight="duotone" /></button>
            <input className="input flex-1" placeholder="Message…" value={text} onChange={(e) => onType(e.target.value)} aria-label="Message" maxLength={2000} />
            <motion.button whileTap={{ scale: 0.9 }} className="sunset flex h-11 w-11 items-center justify-center rounded-full text-white disabled:opacity-50" disabled={!text.trim() && !img.trim()} aria-label="Send"><PaperPlaneTilt size={20} weight="fill" /></motion.button>
          </div>
        </form>
      )}
    </div>
  );
}
