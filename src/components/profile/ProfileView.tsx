"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { LinkSimple, CalendarBlank, Lock, DotsThree, ChatCircle, Prohibit, SpeakerSlash, Flag, PushPin } from "@phosphor-icons/react";
import type { PublicUser } from "@/lib/auth";
import type { FeedPost } from "@/lib/feed";
import { Avatar } from "@/components/ui/Avatar";
import { SmartImage } from "@/components/ui/SmartImage";
import { FollowButton, type FollowState } from "./FollowButton";
import { Feed } from "@/components/feed/Feed";
import { PostCard } from "@/components/post/PostCard";
import { useViewer } from "@/components/providers";
import { useUiStore, toast } from "@/store/useUiStore";
import { api } from "@/lib/client";
import { cn, formatCount } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

type Req = { id: string; username: string; displayName: string; avatarUrl: string };
type Props = { user: PublicUser; counts: { followers: number; following: number; posts: number }; followState: FollowState; canView: boolean; blockedByMe: boolean; blockedMe: boolean; muted: boolean; pinned: FeedPost | null; requests: Req[] };
const TABS = ["Posts", "Replies", "Media", "Likes"] as const;

export function ProfileView({ user, counts, followState, canView, blockedByMe, blockedMe, muted: mutedInit, pinned, requests: reqInit }: Props) {
  const viewer = useViewer();
  const router = useRouter();
  const setReportTarget = useUiStore((s) => s.setReportTarget);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Posts");
  const [menu, setMenu] = useState(false);
  const [blocked, setBlocked] = useState(blockedByMe);
  const [muted, setMuted] = useState(mutedInit);
  const [followers, setFollowers] = useState(counts.followers);
  const [requests, setRequests] = useState(reqInit);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const bannerY = useTransform(scrollY, [0, 300], [0, 80]);
  const avatarScale = useTransform(scrollY, [0, 200], [1, 0.7]);
  const isMe = viewer?.id === user.id;

  const toggle = async (kind: "block" | "mute") => {
    try {
      const r = await api<{ blocked?: boolean; muted?: boolean }>(`/api/users/${user.username}/${kind}`, { method: "POST" });
      if (kind === "block") {
        setBlocked(!!r.blocked);
        toast(r.blocked ? `Blocked @${user.username}` : `Unblocked @${user.username}`);
        router.refresh();
      } else {
        setMuted(!!r.muted);
        toast(r.muted ? `Muted @${user.username}` : `Unmuted @${user.username}`);
      }
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    }
  };
  const message = async () => {
    try {
      const r = await api<{ id: string }>("/api/messages", { method: "POST", json: { memberIds: [user.id] } });
      router.push(`/messages/${r.id}`);
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    }
  };
  const decide = async (requesterId: string, accept: boolean) => {
    await api("/api/users/requests", { method: "POST", json: { requesterId, accept } });
    setRequests((r) => r.filter((x) => x.id !== requesterId));
    if (accept) setFollowers((f) => f + 1);
  };

  return (
    <div ref={ref} className="space-y-4">
      <div className="card overflow-hidden">
        <div className="relative h-40 overflow-hidden sm:h-52">
          <motion.div style={{ y: bannerY }} className="absolute inset-0 -bottom-20">
            {user.bannerUrl ? <SmartImage src={user.bannerUrl} alt="" className="h-full w-full" priority /> : <div className="sunset h-full w-full opacity-80" />}
          </motion.div>
        </div>
        <div className="px-4 pb-4 sm:px-5">
          <div className="-mt-12 flex items-end justify-between gap-2">
            <motion.div style={{ scale: avatarScale, transformOrigin: "bottom left" }} className="rounded-full border-4 border-surface">
              <Avatar src={user.avatarUrl} name={user.displayName} size={96} online={Date.now() - new Date(user.lastActiveAt).getTime() < 5 * 60_000} />
            </motion.div>
            <div className="flex items-center gap-2 pb-1">
              {isMe ? (
                <Link href="/settings" className="btn-ghost text-sm">Edit profile</Link>
              ) : viewer ? (
                <>
                  {!blocked && !blockedMe && <button onClick={message} aria-label="Message" className="btn-ghost px-3"><ChatCircle size={20} /></button>}
                  {!blocked && !blockedMe && <FollowButton username={user.username} initialState={followState} isPrivate={user.isPrivate} onChange={(s) => setFollowers((f) => f + (s === "following" ? 1 : followState === "following" ? -1 : 0))} />}
                  <div className="relative">
                    <button onClick={() => setMenu((m) => !m)} aria-label="More options" aria-haspopup="menu" className="btn-ghost px-3"><DotsThree size={20} weight="bold" /></button>
                    {menu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                        <ul role="menu" className="card absolute right-0 top-12 z-20 w-52 p-1.5 text-sm" onClick={() => setMenu(false)}>
                          <li><button role="menuitem" onClick={() => toggle("mute")} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 hover:bg-elevated"><SpeakerSlash size={18} /> {muted ? "Unmute" : "Mute"}</button></li>
                          <li><button role="menuitem" onClick={() => toggle("block")} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-coral-deep hover:bg-elevated"><Prohibit size={18} /> {blocked ? "Unblock" : "Block"}</button></li>
                          <li><button role="menuitem" onClick={() => setReportTarget({ type: "user", id: user.id })} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-coral-deep hover:bg-elevated"><Flag size={18} /> Report</button></li>
                        </ul>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <Link href="/login" className="btn-primary text-sm">Follow</Link>
              )}
            </div>
          </div>
          <h1 className="mt-3 flex items-center gap-2 text-2xl">{user.displayName} {user.isPrivate && <Lock size={18} className="text-muted" aria-label="Private account" />}{user.role !== "member" && <span className="pill bg-lilac text-[10px] uppercase text-violet dark:bg-violet/20">{user.role}</span>}</h1>
          <p className="text-muted">@{user.username}</p>
          {user.suspended && <p className="mt-2 rounded-xl bg-warning/15 px-3 py-2 text-sm">This account is temporarily suspended.</p>}
          {user.bio && <p className="mt-2 break-anywhere">{user.bio}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {user.link && <a href={user.link} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 text-[#1a7fb8] hover:underline dark:text-sky"><LinkSimple size={16} /> {user.link.replace(/^https?:\/\//, "")}</a>}
            <span className="flex items-center gap-1"><CalendarBlank size={16} /> Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          </div>
          <div className="mt-3 flex gap-5 text-sm">
            <span><strong>{formatCount(counts.posts)}</strong> <span className="text-muted">posts</span></span>
            <span><strong>{formatCount(followers)}</strong> <span className="text-muted">followers</span></span>
            <span><strong>{formatCount(counts.following)}</strong> <span className="text-muted">following</span></span>
          </div>
        </div>
      </div>

      {isMe && requests.length > 0 && (
        <section className="card p-4" aria-label="Follow requests">
          <h2 className="mb-2 text-base">Follow requests ({requests.length})</h2>
          <ul className="space-y-2">{requests.map((r) => <li key={r.id} className="flex items-center gap-2"><Avatar src={r.avatarUrl} name={r.displayName} size={36} /><Link href={`/u/${r.username}`} className="flex-1 truncate text-sm font-semibold">{r.displayName} <span className="font-normal text-muted">@{r.username}</span></Link><button className="btn-primary min-h-9 px-3 text-xs" onClick={() => decide(r.id, true)}>Accept</button><button className="btn-ghost min-h-9 px-3 text-xs" onClick={() => decide(r.id, false)}>Decline</button></li>)}</ul>
        </section>
      )}

      {blockedMe ? <EmptyState title="You can't view this account" /> : blocked ? <EmptyState title={`You blocked @${user.username}`} hint="Unblock to see their posts again." /> : !canView ? (
        <EmptyState title="This account is private" hint={`Follow @${user.username} to see their posts. They'll get a request to approve.`} />
      ) : (
        <>
          <div role="tablist" aria-label="Profile sections" className="card flex p-1">
            {TABS.map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("relative min-h-11 flex-1 rounded-full text-sm font-semibold", tab === t ? "text-coral-deep dark:text-peach" : "text-muted")}>
                {t}
                {tab === t && <motion.span layoutId="profile-tab" className="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-coral" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
              </button>
            ))}
          </div>
          {tab === "Posts" && pinned && !pinned.deletedAt && (
            <div><p className="mb-1 flex items-center gap-1 px-1 text-xs font-semibold text-muted"><PushPin size={14} weight="fill" /> Pinned</p><PostCard post={pinned} /></div>
          )}
          <Feed key={tab} endpoint={`/api/users/${user.username}/posts?tab=${tab.toLowerCase()}`} caughtUpText={`That's all of ${isMe ? "your" : user.displayName.split(" ")[0] + "'s"} ${tab.toLowerCase()}`} emptyTitle={`No ${tab.toLowerCase()} yet`} />
        </>
      )}
    </div>
  );
}
