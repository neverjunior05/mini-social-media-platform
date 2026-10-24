"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { api } from "@/lib/client";
import { toast, useUiStore } from "@/store/useUiStore";
import { INTERESTS, site } from "@/config/site";
import { media } from "@/config/media";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

type S = { username: string; displayName: string; bio: string; link: string | null; avatarUrl: string; bannerUrl: string | null; isPrivate: boolean; allowMessagesFrom: string; allowMentionsFrom: string; notifPrefs: Record<string, boolean>; reduceMotion: boolean; soundEnabled: boolean; takeABreak: boolean; accentColor: string; interests: string[]; mutedWords: string[]; email: string; deletionRequestedAt: string | null };
const SECTIONS = ["Profile", "Privacy", "Notifications", "Safety", "Appearance", "Data"] as const;
const NOTIF_TYPES: [string, string][] = [["reaction", "Reactions"], ["comment", "Comments"], ["mention", "Mentions"], ["follow", "New followers"], ["follow_request", "Follow requests"], ["poll_ended", "Poll endings"], ["story_view", "Story views"], ["repost", "Reposts"]];
const ACCENTS = ["#FF5E6C", "#E83E9B", "#7B5CFF", "#3DDBB0", "#FFA877", "#5CC8FF"];

export function SettingsView() {
  const [s, setS] = useState<S | null>(null);
  const [tab, setTab] = useState<(typeof SECTIONS)[number]>("Profile");
  const [saving, setSaving] = useState(false);
  const [word, setWord] = useState("");
  const { theme, setTheme } = useTheme();
  const setReduce = useUiStore((x) => x.setReduceMotion);
  const setSound = useUiStore((x) => x.setSoundEnabled);
  const router = useRouter();
  useEffect(() => {
    api<{ settings: S }>("/api/settings").then((r) => setS(r.settings)).catch((e) => toast({ title: (e as Error).message, kind: "error" }));
    const h = window.location.hash.replace("#", "");
    const match = SECTIONS.find((x) => x.toLowerCase() === h);
    if (match) setTab(match);
  }, []);
  const save = async (patch: Partial<S>, msg = "Saved") => {
    if (!s) return;
    setS({ ...s, ...patch });
    setSaving(true);
    try {
      await api("/api/settings", { method: "PATCH", json: patch });
      toast({ title: msg, kind: "success" });
      if (patch.reduceMotion !== undefined) setReduce(patch.reduceMotion);
      if (patch.soundEnabled !== undefined) setSound(patch.soundEnabled);
      if (patch.accentColor) document.documentElement.style.setProperty("--accent", patch.accentColor);
      router.refresh();
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    } finally {
      setSaving(false);
    }
  };
  if (!s) return <div className="space-y-3"><Skeleton className="h-10 w-40" /><Skeleton className="h-64" /></div>;
  const Toggle = ({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 py-2">
      <span><span className="block font-medium">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
      <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)} className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", value ? "bg-coral" : "bg-hairline")}>
        <motion.span layout className="absolute top-1 h-5 w-5 rounded-full bg-white shadow" animate={{ left: value ? 26 : 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
      </button>
    </label>
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Settings</h1>
      <div role="tablist" className="card flex overflow-x-auto p-1 no-scrollbar">{SECTIONS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("relative min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold", tab === t ? "text-coral-deep dark:text-peach" : "text-muted")}>{t}{tab === t && <motion.span layoutId="settings-tab" className="absolute inset-0 -z-10 rounded-full bg-elevated" />}</button>)}</div>
      <motion.section key={tab} id={tab.toLowerCase()} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card space-y-3 p-4 sm:p-5" aria-busy={saving}>
        {tab === "Profile" && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save({ displayName: String(f.get("displayName")), bio: String(f.get("bio")), link: String(f.get("link")), avatarUrl: String(f.get("avatarUrl")), bannerUrl: String(f.get("bannerUrl")) }, "Profile updated"); }}>
            <div className="flex items-center gap-3"><Avatar src={s.avatarUrl} name={s.displayName} size={64} /><div className="flex flex-wrap gap-1">{media.avatars.styles.map((st) => <button type="button" key={st} onClick={() => save({ avatarUrl: media.avatars.dicebear(st, s.username) }, "Avatar updated")} className="pill min-h-8 text-[11px]">{st}</button>)}</div></div>
            <label className="block text-sm font-medium">Display name<input name="displayName" defaultValue={s.displayName} maxLength={40} className="input mt-1" /></label>
            <label className="block text-sm font-medium">Bio<textarea name="bio" defaultValue={s.bio} maxLength={200} className="input mt-1" /></label>
            <label className="block text-sm font-medium">Link<input name="link" defaultValue={s.link ?? ""} placeholder="https://" className="input mt-1" /></label>
            <label className="block text-sm font-medium">Avatar URL<input name="avatarUrl" defaultValue={s.avatarUrl} className="input mt-1" /></label>
            <label className="block text-sm font-medium">Banner URL<input name="bannerUrl" defaultValue={s.bannerUrl ?? ""} className="input mt-1" /></label>
            <div><p className="mb-1 text-sm font-medium">Interests (power Discover boosts)</p><div className="flex flex-wrap gap-1.5">{INTERESTS.map((i) => <button type="button" key={i} onClick={() => save({ interests: s.interests.includes(i) ? s.interests.filter((x) => x !== i) : [...s.interests, i] }, "Interests updated")} className={cn("pill min-h-9", s.interests.includes(i) && "sunset text-white")}>#{i}</button>)}</div></div>
            <button className="btn-primary" disabled={saving}>Save profile</button>
          </form>
        )}
        {tab === "Privacy" && (
          <>
            <Toggle label="Private account" hint="Only approved followers see your posts. Switching back to public makes posts visible to everyone again." value={s.isPrivate} onChange={(v) => save({ isPrivate: v })} />
            <label className="block text-sm font-medium">Who can message you<select className="input mt-1" value={s.allowMessagesFrom} onChange={(e) => save({ allowMessagesFrom: e.target.value })}><option value="everyone">Everyone</option><option value="followers">People you follow</option><option value="nobody">Nobody</option></select></label>
            <label className="block text-sm font-medium">Who can mention you<select className="input mt-1" value={s.allowMentionsFrom} onChange={(e) => save({ allowMentionsFrom: e.target.value })}><option value="everyone">Everyone</option><option value="followers">People you follow</option><option value="nobody">Nobody</option></select></label>
          </>
        )}
        {tab === "Notifications" && (
          <>
            <Toggle label="Take a break" hint="Pauses all notifications (except moderation updates) until you turn it off." value={s.takeABreak} onChange={(v) => save({ takeABreak: v }, v ? "Enjoy your break 🌿" : "Welcome back")} />
            <div className="divide-y divide-hairline">{NOTIF_TYPES.map(([k, l]) => <Toggle key={k} label={l} value={s.notifPrefs[k] !== false} onChange={(v) => save({ notifPrefs: { ...s.notifPrefs, [k]: v } })} />)}</div>
          </>
        )}
        {tab === "Safety" && (
          <>
            <Toggle label="Take a break" hint="Pause notifications." value={s.takeABreak} onChange={(v) => save({ takeABreak: v })} />
            <div><p className="font-medium">Muted words</p><p className="text-xs text-muted">Posts containing these words are hidden from your feeds and search.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{s.mutedWords.map((w) => <button key={w} onClick={() => save({ mutedWords: s.mutedWords.filter((x) => x !== w) })} className="pill">{w} ×</button>)}</div>
              <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (word.trim()) { save({ mutedWords: [...s.mutedWords, word.trim()] }); setWord(""); } }}><input className="input" value={word} onChange={(e) => setWord(e.target.value)} placeholder="Add a word" maxLength={40} /><button className="btn-ghost">Add</button></form></div>
            <p className="text-sm text-muted">Block or mute people from their profile menu. Report anything from the ··· menu on posts, comments, profiles and chats.</p>
          </>
        )}
        {tab === "Appearance" && (
          <>
            <div><p className="mb-1 font-medium">Theme</p><div className="flex gap-2">{["light", "dark", "system"].map((t) => <button key={t} onClick={() => setTheme(t)} className={cn("pill min-h-10 flex-1 capitalize", theme === t && "sunset text-white")}>{t}</button>)}</div></div>
            <div><p className="mb-1 font-medium">Accent color</p><div className="flex gap-2">{ACCENTS.map((c) => <button key={c} aria-label={c} onClick={() => save({ accentColor: c })} className={cn("h-10 w-10 rounded-full border-4", s.accentColor === c ? "border-ink" : "border-transparent")} style={{ background: c }} />)}</div></div>
            <Toggle label="Reduce motion" hint="Overrides your OS setting. Disables parallax, cursor glow, ring rotation and celebrations." value={s.reduceMotion} onChange={(v) => save({ reduceMotion: v })} />
            <Toggle label="Sounds" hint="Soft pop on reactions and a gentle ping for messages. Off by default." value={s.soundEnabled} onChange={(v) => save({ soundEnabled: v })} />
          </>
        )}
        {tab === "Data" && (
          <>
            <p className="text-sm text-muted">Signed in as <strong>{s.email}</strong>.</p>
            <a href="/api/settings/export" download className="btn-ghost inline-block">Download my data (JSON)</a>
            <div className="rounded-2xl border border-error/40 p-4">
              <p className="font-semibold text-error">Delete account</p>
              <p className="text-sm text-muted">Your account is deactivated immediately and permanently deleted after a {site.deletionGraceDays}-day grace period. Signing in again cancels the deletion.</p>
              <button className="mt-2 rounded-full bg-error px-4 py-2 text-sm font-semibold text-white" onClick={async () => { if (confirm("Schedule your account for deletion?")) { await api("/api/settings/delete", { method: "POST" }); router.push("/"); router.refresh(); } }}>Delete my account</button>
            </div>
          </>
        )}
      </motion.section>
    </div>
  );
}
