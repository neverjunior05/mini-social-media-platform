"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PencilSimpleLine, UsersThree } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client";
import { toast } from "@/store/useUiStore";
import { onRealtime } from "@/hooks/useRealtime";
import { useViewer } from "@/components/providers";
import { timeAgo } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { site } from "@/config/site";

type Member = { id: string; username: string; displayName: string; avatarUrl: string; lastActiveAt: string };
type Conv = { id: string; isGroup: boolean; name: string | null; lastMessageAt: string; members: Member[]; lastMessage: { text: string; imageUrl: string | null; senderId: string; createdAt: string } | null; unread: number };

export function ConversationList() {
  const viewer = useViewer();
  const router = useRouter();
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Member[]>([]);
  const [picked, setPicked] = useState<Member[]>([]);
  const [groupName, setGroupName] = useState("");
  const load = () => api<{ conversations: Conv[] }>("/api/messages").then((r) => setConvs(r.conversations)).catch(() => setConvs([]));
  useEffect(() => {
    load();
    return onRealtime((ev) => ev.type === "message" && load());
  }, []);
  useEffect(() => {
    if (!q.trim()) return setFound([]);
    const t = setTimeout(() => api<{ users: Member[] }>(`/api/users/mention?q=${encodeURIComponent(q)}`).then((r) => setFound(r.users.filter((u) => u.id !== viewer?.id))).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q, viewer?.id]);
  const start = async () => {
    try {
      const r = await api<{ id: string }>("/api/messages", { method: "POST", json: { memberIds: picked.map((p) => p.id), name: groupName || undefined } });
      router.push(`/messages/${r.id}`);
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    }
  };
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between"><h1 className="text-2xl">Messages</h1><button className="btn-primary flex items-center gap-1" onClick={() => setNewOpen(true)}><PencilSimpleLine size={18} /> New</button></header>
      {!convs && <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>}
      {convs && convs.length === 0 && <EmptyState title="No chats yet" hint="Start a conversation with a friend or make a small group (up to 8)." />}
      <ul className="space-y-2">
        {convs?.map((c, i) => {
          const others = c.members.filter((m) => m.id !== viewer?.id);
          const title = c.isGroup ? c.name ?? others.map((o) => o.displayName.split(" ")[0]).join(", ") : others[0]?.displayName ?? "Chat";
          const online = others.some((o) => Date.now() - new Date(o.lastActiveAt).getTime() < 5 * 60_000);
          return (
            <motion.li key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link href={`/messages/${c.id}`} className={`card flex items-center gap-3 p-3 transition-colors hover:bg-elevated/50 ${c.unread ? "border-coral/40" : ""}`}>
                {c.isGroup ? <span className="flex h-11 w-11 items-center justify-center rounded-full bg-lilac text-violet dark:bg-violet/20"><UsersThree size={22} weight="duotone" /></span> : <Avatar src={others[0]?.avatarUrl} name={title} size={44} online={online} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2"><span className="truncate font-semibold">{title}</span><span className="shrink-0 text-xs text-muted">{c.lastMessage ? timeAgo(c.lastMessage.createdAt) : ""}</span></div>
                  <p className={`truncate text-sm ${c.unread ? "font-semibold text-ink" : "text-muted"}`}>{c.lastMessage ? (c.lastMessage.senderId === viewer?.id ? "You: " : "") + (c.lastMessage.text || "📷 Photo") : "Say hi 👋"}</p>
                </div>
                {c.unread > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} className="flex h-6 min-w-6 items-center justify-center rounded-full bg-coral px-1.5 text-xs font-bold text-white">{c.unread}</motion.span>}
              </Link>
            </motion.li>
          );
        })}
      </ul>
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New message" size="sm">
        <div className="mb-2 flex flex-wrap gap-1">{picked.map((p) => <button key={p.id} onClick={() => setPicked(picked.filter((x) => x.id !== p.id))} className="pill flex items-center gap-1">{p.displayName} ×</button>)}</div>
        <input className="input" placeholder="Search people…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">{found.filter((f) => !picked.some((p) => p.id === f.id)).map((u) => <li key={u.id}><button onClick={() => picked.length < site.maxGroupChat - 1 && setPicked([...picked, u])} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-sm hover:bg-elevated"><Avatar src={u.avatarUrl} name={u.displayName} size={30} /><span className="font-semibold">{u.displayName}</span><span className="text-muted">@{u.username}</span></button></li>)}</ul>
        {picked.length > 1 && <input className="input mt-2" placeholder="Group name (optional)" value={groupName} onChange={(e) => setGroupName(e.target.value)} maxLength={40} />}
        <button className="btn-primary mt-3 w-full" disabled={!picked.length} onClick={start}>{picked.length > 1 ? `Start group (${picked.length + 1}/${site.maxGroupChat})` : "Start chat"}</button>
      </Modal>
    </div>
  );
}
