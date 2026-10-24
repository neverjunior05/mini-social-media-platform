"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/client";
import { toast } from "@/store/useUiStore";
import { INTERESTS } from "@/config/site";
import { media } from "@/config/media";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type U = { id: string; username: string; displayName: string; avatarUrl: string; bio: string; interests: string[] };

/** Three animated steps: avatar → interests → follow suggestions. */
export function Onboarding({ username, avatarUrl }: { username: string; avatarUrl: string }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [custom, setCustom] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<U[]>([]);
  const [follow, setFollow] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (step === 2) api<{ users: U[] }>("/api/users/suggestions").then((r) => { setSuggested(r.users); setFollow(r.users.slice(0, 5).map((u) => u.username)); });
  }, [step]);
  const finish = async () => {
    setBusy(true);
    try {
      await api("/api/settings", { method: "PATCH", json: { avatarUrl: avatar, interests, onboarded: true } });
      await Promise.all(follow.map((u) => api(`/api/users/${u}/follow`, { method: "POST" }).catch(() => {})));
      if (!reduced) confetti({ particleCount: 90, spread: 80, colors: ["#FFA877", "#FF5E6C", "#E83E9B", "#7B5CFF"] });
      router.push("/home");
      router.refresh();
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
      setBusy(false);
    }
  };
  const steps = [
    { title: "Pick your look", hint: "Choose an avatar style or paste your own image URL." },
    { title: "What do you love?", hint: "Interests gently shape Discover. Pick a few." },
    { title: "Follow some friendly faces", hint: "Fictional demo accounts, pre-selected for you. Untick any." },
  ];
  return (
    <div className="aurora flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="glass w-full max-w-lg rounded-[28px] p-6 shadow-glow sm:p-8">
        <div className="mb-5 flex gap-1.5" aria-label={`Step ${step + 1} of 3`}>{[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 flex-1 rounded-full bg-hairline" animate={{ background: i <= step ? "#FF5E6C" : "var(--p-hairline)" }} />)}</div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <h1 className="text-2xl">{steps[step].title}</h1>
            <p className="mb-4 text-sm text-muted">{steps[step].hint}</p>
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex justify-center"><Avatar src={avatar} name={username} size={112} ring="unseen" /></div>
                <div className="grid grid-cols-3 gap-2">{media.avatars.styles.map((st, i) => { const url = media.avatars.dicebear(st, username); return <motion.button key={st} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} onClick={() => setAvatar(url)} className={cn("flex flex-col items-center gap-1 rounded-2xl border p-2 text-xs capitalize", avatar === url ? "border-coral bg-coral/10" : "border-hairline")}><img src={url} alt="" className="h-12 w-12 rounded-full" /> {st.replace("-", " ")}</motion.button>; })}</div>
                <input className="input" placeholder="…or paste an image URL" value={custom} onChange={(e) => { setCustom(e.target.value); if (/^https?:\/\//.test(e.target.value)) setAvatar(e.target.value); }} />
              </div>
            )}
            {step === 1 && (
              <div className="flex flex-wrap gap-2">{INTERESTS.map((i, k) => <motion.button key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.03 }} whileTap={{ scale: 0.92 }} onClick={() => setInterests((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))} className={cn("pill min-h-11 px-4 text-sm", interests.includes(i) && "sunset text-white")}>#{i}</motion.button>)}</div>
            )}
            {step === 2 && (
              <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">{suggested.map((u, k) => <motion.li key={u.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.04 }}><label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-hairline p-2"><input type="checkbox" className="accent-coral" checked={follow.includes(u.username)} onChange={(e) => setFollow((f) => (e.target.checked ? [...f, u.username] : f.filter((x) => x !== u.username)))} /><Avatar src={u.avatarUrl} name={u.displayName} size={36} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{u.displayName}</span><span className="block truncate text-xs text-muted">{u.bio}</span></span></label></motion.li>)}{!suggested.length && <li className="skeleton h-12" />}</ul>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 flex justify-between">
          <button className="btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</button>
          {step < 2 ? <button className="btn-primary" onClick={() => setStep((s) => s + 1)}>Continue</button> : <button className="btn-primary" disabled={busy} onClick={finish}>{busy ? "Setting up…" : "Enter Pebble ✨"}</button>}
        </div>
      </div>
    </div>
  );
}
