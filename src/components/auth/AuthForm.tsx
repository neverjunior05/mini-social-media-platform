"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/client";
import { PebbleMark } from "@/components/ui/SmartImage";

const DEMO = [
  ["Member", "maya@pebble.demo"],
  ["Private member", "juno@pebble.demo"],
  ["Moderator", "sol@pebble.demo"],
  ["Admin", "ada@pebble.demo"],
];

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "", username: "", displayName: "", website: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home"; // open-redirect protection
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ onboarded?: boolean }>(`/api/auth/${mode}`, { method: "POST", json: form });
      router.push(mode === "register" || r.onboarded === false ? "/onboarding" : safeNext);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="aurora flex min-h-dvh items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="glass w-full max-w-md rounded-[28px] p-6 shadow-glow sm:p-8">
        <Link href="/" className="mb-6 flex items-center gap-2 font-heading text-2xl font-extrabold"><PebbleMark className="h-9 w-9" /> pebble</Link>
        <h1 className="text-2xl">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mb-4 text-sm text-muted">{mode === "login" ? "Your calm corner is waiting." : "Takes under a minute. No ads, no algorithms."}</p>
        <form onSubmit={submit} className="space-y-3" noValidate>
          {mode === "register" && (
            <>
              <label className="block text-sm font-medium">Display name<input required className="input mt-1" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} maxLength={40} autoComplete="name" /></label>
              <label className="block text-sm font-medium">Username<div className="relative mt-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">@</span><input required className="input pl-8" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} pattern="[a-z0-9_]{3,20}" maxLength={20} autoComplete="username" /></div></label>
            </>
          )}
          <label className="block text-sm font-medium">Email<input required type="email" className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label>
          <label className="block text-sm font-medium">Password<input required type="password" className="input mt-1" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          {/* honeypot */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="hidden" aria-hidden />
          {error && <p role="alert" aria-live="assertive" className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? "One sec…" : mode === "login" ? "Sign in" : "Create account"}</button>
          <button type="button" className="btn-ghost w-full" onClick={() => setError("Google sign-in needs GOOGLE_CLIENT_ID / SECRET in .env — see README. Use a demo account below.")}>Continue with Google</button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">{mode === "login" ? <>New here? <Link href="/register" className="font-semibold text-coral-deep dark:text-peach">Create an account</Link></> : <>Already have one? <Link href="/login" className="font-semibold text-coral-deep dark:text-peach">Sign in</Link></>}</p>
        {mode === "login" && (
          <div className="mt-5 rounded-2xl border border-hairline bg-surface/60 p-3 text-xs">
            <p className="mb-2 font-semibold">Demo accounts <span className="font-normal text-muted">(password: pebble123)</span></p>
            <div className="grid grid-cols-2 gap-1">{DEMO.map(([l, e]) => <button key={e} type="button" onClick={() => setForm({ ...form, email: e, password: "pebble123" })} className="rounded-xl bg-elevated px-2 py-1.5 text-left hover:bg-hairline/60"><span className="block font-semibold">{l}</span><span className="text-muted">{e}</span></button>)}</div>
          </div>
        )}
        <p className="mt-4 text-center text-[11px] text-muted">Demo platform — all seeded users and content are fictional.</p>
      </motion.div>
    </div>
  );
}
