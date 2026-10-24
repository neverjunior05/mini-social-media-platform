"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, UsersThree, Plus } from "@phosphor-icons/react";
import { SmartImage } from "@/components/ui/SmartImage";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client";
import { toast } from "@/store/useUiStore";
import { JoinButton } from "./JoinButton";

type C = { id: string; slug: string; name: string; description: string; coverUrl: string | null; isPrivate: boolean; members: number; membership: string | null };

export function CirclesGrid({ circles, canCreate }: { circles: C[]; canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", rules: "", coverUrl: "", isPrivate: false });
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const create = async () => {
    setBusy(true);
    try {
      const r = await api<{ circle: { slug: string } }>("/api/circles", { method: "POST", json: form });
      toast({ title: "Circle created", kind: "success" });
      router.push(`/circles/${r.circle.slug}`);
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div><h1 className="text-2xl">Circles</h1><p className="text-sm text-muted">Small communities around what you love.</p></div>
        {canCreate && <button className="btn-primary flex items-center gap-1" onClick={() => setOpen(true)}><Plus size={18} weight="bold" /> New circle</button>}
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {circles.map((c, i) => (
          <motion.li key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card overflow-hidden">
            <Link href={`/circles/${c.slug}`} className="block">
              <div className="relative h-32 overflow-hidden">
                {c.coverUrl ? <div className="kenburns h-full w-full"><SmartImage src={c.coverUrl} alt="" className="h-full w-full" /></div> : <div className="sunset h-full w-full opacity-80" />}
                {c.isPrivate && <span className="glass absolute left-3 top-3 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"><Lock size={12} weight="bold" /> Private</span>}
              </div>
            </Link>
            <div className="p-4">
              <Link href={`/circles/${c.slug}`} className="text-lg font-bold hover:underline">{c.name}</Link>
              <p className="line-clamp-2 text-sm text-muted">{c.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-muted"><UsersThree size={16} /> {c.members} members</span>
                {canCreate && <JoinButton slug={c.slug} isPrivate={c.isPrivate} initial={c.membership === "active" ? "member" : c.membership === "pending" ? "pending" : "none"} />}
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
      <Modal open={open} onClose={() => setOpen(false)} title="Create a circle" size="sm">
        <div className="space-y-2">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={40} />
          <textarea className="input" placeholder="What is this circle about?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} />
          <textarea className="input" placeholder="Rules (one per line)" value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} maxLength={1000} />
          <input className="input" placeholder="Cover image URL (optional)" value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} />
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="accent-coral" checked={form.isPrivate} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} /> Private — members must be approved, posts are hidden from non-members</label>
          <button className="btn-primary w-full" disabled={busy || form.name.trim().length < 2} onClick={create}>Create circle</button>
        </div>
      </Modal>
    </div>
  );
}
