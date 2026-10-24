"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/client";
import { toast } from "@/store/useUiStore";
import { cn, timeAgo } from "@/lib/utils";
import { RollingNumber } from "@/components/reactions/ReactionButton";
import { Skeleton } from "@/components/ui/Skeleton";

type Report = { id: string; targetType: string; targetId: string; reason: string; details: string; status: string; createdAt: string; reporter: string; context: Record<string, string | null> | null };
type Appeal = { id: string; userId: string; postId: string | null; text: string; status: string; username: string; postText: string | null; removedReason: string | null; createdAt: string };
type UserRow = { id: string; username: string; displayName: string; avatarUrl: string; email: string; role: string; suspendedUntil: string | null; posts: number; createdAt: string };
type Analytics = { series: { day: string; activeUsers: number; posts: number; reactions: number; comments: number; reportsResolved: number }[]; totals: { users: number; posts: number; circles: number; openReports: number } };
type Log = { id: string; actor: string; action: string; targetType: string; targetId: string; meta: Record<string, unknown> | null; createdAt: string };
const TABS = ["Reports", "Appeals", "Users", "Analytics", "Audit log"] as const;

export function ModerationDashboard({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Reports");
  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [q, setQ] = useState("");
  const [workerMsg, setWorkerMsg] = useState("");

  useEffect(() => {
    api<{ reports: Report[] }>(`/api/moderation/reports?status=${status}`).then((r) => setReports(r.reports)).catch((e) => toast({ title: (e as Error).message, kind: "error" }));
  }, [status]);
  useEffect(() => {
    if (tab === "Appeals") api<{ appeals: Appeal[] }>("/api/moderation/appeals").then((r) => setAppeals(r.appeals));
    if (tab === "Users") api<{ users: UserRow[] }>(`/api/moderation/users?q=${encodeURIComponent(q)}`).then((r) => setUsers(r.users));
    if (tab === "Analytics") api<Analytics>("/api/admin/analytics").then(setAnalytics);
    if (tab === "Audit log") api<{ logs: Log[] }>("/api/admin/audit").then((r) => setLogs(r.logs));
  }, [tab, q]);

  const resolve = async (id: string, action: "dismiss" | "remove" | "warn" | "suspend") => {
    const reason = action === "dismiss" ? "" : prompt("Reason (shown to the affected user):", "") ?? "";
    if (action !== "dismiss" && reason === null) return;
    try {
      await api("/api/moderation/reports", { method: "PATCH", json: { id, action, reason, days: 7 } });
      setReports((r) => (r ?? []).filter((x) => x.id !== id));
      toast({ title: `Report ${action === "dismiss" ? "dismissed" : "resolved"} · logged`, kind: "success" });
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    }
  };
  const decideAppeal = async (id: string, accept: boolean) => {
    await api("/api/moderation/appeals", { method: "PATCH", json: { id, accept } });
    setAppeals((a) => (a ?? []).map((x) => (x.id === id ? { ...x, status: accept ? "accepted" : "rejected" } : x)));
  };
  const patchUser = async (userId: string, body: Record<string, unknown>) => {
    try {
      await api("/api/moderation/users", { method: "PATCH", json: { userId, ...body } });
      const r = await api<{ users: UserRow[] }>(`/api/moderation/users?q=${encodeURIComponent(q)}`);
      setUsers(r.users);
      toast({ title: "Updated · logged", kind: "success" });
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-2xl">Moderation {isAdmin && <span className="pill ml-1 bg-lilac text-[10px] uppercase text-violet">admin</span>}</h1><p className="text-sm text-muted">Every action here is audit-logged and explained to the affected person.</p></div>
        <button className="btn-ghost text-xs" onClick={() => api<{ ran: Record<string, number> }>("/api/worker/run", { method: "POST" }).then((r) => setWorkerMsg(JSON.stringify(r.ran)))}>Run worker jobs now</button>
      </header>
      {workerMsg && <p className="rounded-xl bg-mint/15 px-3 py-2 font-mono text-xs">{workerMsg}</p>}
      <div role="tablist" className="card flex overflow-x-auto p-1 no-scrollbar">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("relative min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold", tab === t ? "text-coral-deep dark:text-peach" : "text-muted")}>{t}{tab === t && <motion.span layoutId="mod-tab" className="absolute inset-0 -z-10 rounded-full bg-elevated" />}</button>)}</div>

      {tab === "Reports" && (
        <div className="space-y-3">
          <div className="flex gap-1">{["open", "resolved", "dismissed"].map((s) => <button key={s} onClick={() => { setStatus(s); setReports(null); }} className={cn("pill min-h-9 capitalize", status === s && "sunset text-white")}>{s}</button>)}</div>
          {!reports && <Skeleton className="h-32" />}
          {reports?.length === 0 && <p className="card p-6 text-center font-accent text-xl text-muted">Queue is empty. Nice work. ✨</p>}
          <ul className="space-y-3">
            <AnimatePresence>
              {reports?.map((r) => (
                <motion.li key={r.id} layout exit={{ x: 300, opacity: 0 }} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs"><span className="pill capitalize">{r.targetType}</span><span className="font-semibold text-coral-deep">{r.reason}</span><span className="text-muted">by @{r.reporter} · {timeAgo(r.createdAt)}</span></div>
                  {r.details && <p className="mt-1 text-sm">“{r.details}”</p>}
                  <div className="mt-2 rounded-xl bg-elevated/70 p-3 text-sm">
                    {r.context ? (
                      <>
                        {r.context.username && <p className="text-xs text-muted">@{r.context.username}</p>}
                        <p className="line-clamp-4 break-anywhere">{r.context.text ?? r.context.bio ?? r.context.displayName}</p>
                        {r.targetType === "post" && <Link href={`/post/${r.targetId}`} className="text-xs font-semibold text-violet">Open post →</Link>}
                        {r.targetType === "user" && r.context.username && <Link href={`/u/${r.context.username}`} className="text-xs font-semibold text-violet">Open profile →</Link>}
                        {r.context.deletedAt && <p className="text-xs text-muted">Already removed</p>}
                      </>
                    ) : <p className="text-muted">Content no longer available.</p>}
                  </div>
                  {r.status === "open" && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <button className="btn-ghost min-h-9" onClick={() => resolve(r.id, "dismiss")}>Dismiss</button>
                      {r.targetType !== "user" && <button className="btn-ghost min-h-9" onClick={() => resolve(r.id, "remove")}>Remove content</button>}
                      <button className="btn-ghost min-h-9" onClick={() => resolve(r.id, "warn")}>Warn</button>
                      <button className="min-h-9 rounded-full bg-error px-4 font-semibold text-white" onClick={() => resolve(r.id, "suspend")}>Suspend 7d</button>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {tab === "Appeals" && (
        <ul className="space-y-3">
          {!appeals && <Skeleton className="h-24" />}
          {appeals?.length === 0 && <p className="card p-6 text-center text-muted">No appeals.</p>}
          {appeals?.map((a) => (
            <li key={a.id} className="card p-4 text-sm">
              <div className="flex items-center gap-2 text-xs"><span className={cn("pill capitalize", a.status === "open" ? "bg-warning/20" : a.status === "accepted" ? "bg-mint/20" : "bg-error/15")}>{a.status}</span><span className="text-muted">@{a.username} · {timeAgo(a.createdAt)}</span></div>
              {a.removedReason && <p className="mt-1 text-xs text-muted">Removal reason: {a.removedReason}</p>}
              {a.postText && <p className="mt-1 rounded-xl bg-elevated/70 p-2 line-clamp-3">{a.postText}</p>}
              <p className="mt-2">Appeal: “{a.text}”</p>
              {a.status === "open" && <div className="mt-2 flex gap-2"><button className="btn-primary min-h-9 text-xs" onClick={() => decideAppeal(a.id, true)}>Accept & restore</button><button className="btn-ghost min-h-9 text-xs" onClick={() => decideAppeal(a.id, false)}>Reject</button></div>}
            </li>
          ))}
        </ul>
      )}

      {tab === "Users" && (
        <div className="space-y-2">
          <input className="input" placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
          {!users && <Skeleton className="h-24" />}
          <ul className="space-y-2">{users?.map((u) => (
            <li key={u.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
              <img src={u.avatarUrl} alt="" className="h-9 w-9 rounded-full" />
              <div className="min-w-0 flex-1"><Link href={`/u/${u.username}`} className="font-semibold hover:underline">{u.displayName}</Link> <span className="text-muted">@{u.username}</span><p className="text-xs text-muted">{u.posts} posts · joined {timeAgo(u.createdAt)} {u.suspendedUntil && new Date(u.suspendedUntil) > new Date() && <span className="text-error">· suspended</span>}</p></div>
              {isAdmin && <select className="input min-h-9 w-auto py-1 text-xs" value={u.role} onChange={(e) => patchUser(u.id, { role: e.target.value })}><option value="member">member</option><option value="moderator">moderator</option><option value="admin">admin</option></select>}
              {u.suspendedUntil && new Date(u.suspendedUntil) > new Date() ? <button className="btn-ghost min-h-9 text-xs" onClick={() => patchUser(u.id, { suspendDays: 0 })}>Unsuspend</button> : <button className="btn-ghost min-h-9 text-xs" onClick={() => patchUser(u.id, { suspendDays: 7, reason: "Moderator action" })}>Suspend 7d</button>}
            </li>
          ))}</ul>
        </div>
      )}

      {tab === "Analytics" && (
        <div className="space-y-4">
          {!analytics && <Skeleton className="h-40" />}
          {analytics && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Members", analytics.totals.users], ["Posts", analytics.totals.posts], ["Circles", analytics.totals.circles], ["Open reports", analytics.totals.openReports]].map(([l, v]) => <div key={l as string} className="card p-4"><p className="text-xs text-muted">{l}</p><p className="font-heading text-2xl font-extrabold"><RollingNumber value={v as number} /></p></div>)}
              </div>
              <div className="card p-4"><h2 className="mb-2 text-base">Daily active users <span className="text-xs font-normal text-muted">(seeded history is fictional)</span></h2>
                <div className="h-52" role="img" aria-label={`Daily active users over ${analytics.series.length} days, latest ${analytics.series.at(-1)?.activeUsers ?? 0}`}><ResponsiveContainer><AreaChart data={analytics.series}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF5E6C" stopOpacity={0.5} /><stop offset="100%" stopColor="#7B5CFF" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeOpacity={0.15} vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} /><YAxis tick={{ fontSize: 10 }} width={28} /><Tooltip contentStyle={{ borderRadius: 14 }} /><Area type="monotone" dataKey="activeUsers" stroke="#FF5E6C" fill="url(#g1)" strokeWidth={2} isAnimationActive animationDuration={1200} /></AreaChart></ResponsiveContainer></div></div>
              <div className="card p-4"><h2 className="mb-2 text-base">Posts, comments & reports resolved</h2>
                <div className="h-52" role="img" aria-label="Daily posts, comments and resolved reports"><ResponsiveContainer><BarChart data={analytics.series}><CartesianGrid strokeOpacity={0.15} vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} /><YAxis tick={{ fontSize: 10 }} width={28} /><Tooltip contentStyle={{ borderRadius: 14 }} /><Bar dataKey="posts" fill="#FFA877" radius={[6, 6, 0, 0]} /><Bar dataKey="comments" fill="#7B5CFF" radius={[6, 6, 0, 0]} /><Bar dataKey="reportsResolved" fill="#3DDBB0" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
            </>
          )}
        </div>
      )}

      {tab === "Audit log" && (
        <ul className="card divide-y divide-hairline text-sm">
          {!logs && <li className="p-4"><Skeleton className="h-6" /></li>}
          {logs?.map((l) => <li key={l.id} className="flex flex-wrap items-center gap-2 p-3"><span className="pill font-mono text-[11px]">{l.action}</span><span className="font-semibold">@{l.actor}</span><span className="text-muted">{l.targetType} {l.targetId.slice(0, 8)}…</span>{l.meta && <span className="truncate text-xs text-muted">{JSON.stringify(l.meta)}</span>}<span className="ml-auto text-xs text-muted">{timeAgo(l.createdAt)}</span></li>)}
        </ul>
      )}
    </div>
  );
}
