"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { House, Compass, MagnifyingGlass, Bell, ChatsCircle, BookmarkSimple, UsersThree, GearSix, Plus, ShieldCheck, SignOut, Keyboard, Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useViewer } from "@/components/providers";
import { useUiStore } from "@/store/useUiStore";
import { Avatar } from "@/components/ui/Avatar";
import { PebbleMark } from "@/components/ui/SmartImage";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client";

const NAV = [
  { href: "/home", label: "Home", icon: House },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/search", label: "Search", icon: MagnifyingGlass },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" as const },
  { href: "/messages", label: "Messages", icon: ChatsCircle, badge: "messages" as const },
  { href: "/circles", label: "Circles", icon: UsersThree },
  { href: "/bookmarks", label: "Bookmarks", icon: BookmarkSimple },
  { href: "/settings", label: "Settings", icon: GearSix },
];

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <motion.span key={n} initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.25, 1] }} className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[11px] font-bold text-white" aria-label={`${n} unread`}>
      {n > 99 ? "99+" : n}
    </motion.span>
  );
}

/** Desktop sidebar (≥1024) + tablet icon rail (768–1023). */
export function SideNav() {
  const path = usePathname();
  const viewer = useViewer();
  const unread = useUiStore((s) => s.unread);
  const setComposerOpen = useUiStore((s) => s.setComposerOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isStaff = viewer?.role === "moderator" || viewer?.role === "admin";
  return (
    <nav aria-label="Primary" className="sticky top-0 hidden h-dvh flex-col gap-1 py-5 md:flex md:w-[76px] md:items-center lg:w-[250px] lg:items-stretch lg:pr-4">
      <Link href="/home" className="mb-4 flex items-center gap-2 px-3 font-heading text-2xl font-extrabold tracking-tight">
        <PebbleMark className="h-9 w-9" /> <span className="hidden lg:inline">pebble</span>
      </Link>
      {NAV.map((n) => {
        const active = path === n.href || path.startsWith(n.href + "/");
        const count = n.badge ? unread[n.badge] : 0;
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-12 items-center gap-3 rounded-full px-3 text-[15px] font-semibold transition-colors hover:bg-elevated md:justify-center lg:justify-start", active ? "text-coral-deep dark:text-peach" : "text-ink")}>
            <span className="relative"><n.icon size={26} weight={active ? "fill" : "duotone"} /><Badge n={count} /></span>
            <span className="hidden lg:inline">{n.label}</span>
            {active && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-elevated" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
          </Link>
        );
      })}
      {isStaff && (
        <Link href="/moderation" className={cn("flex min-h-12 items-center gap-3 rounded-full px-3 text-[15px] font-semibold hover:bg-elevated md:justify-center lg:justify-start", path.startsWith("/moderation") || path.startsWith("/admin") ? "text-coral-deep" : "")}>
          <ShieldCheck size={26} weight="duotone" /> <span className="hidden lg:inline">Moderation</span>
        </Link>
      )}
      <button onClick={() => setComposerOpen(true)} className="sunset mt-3 flex min-h-12 items-center justify-center gap-2 rounded-full px-4 font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 active:scale-95">
        <Plus size={22} weight="bold" /> <span className="hidden lg:inline">New post</span>
      </button>
      <div className="mt-auto flex flex-col gap-1">
        <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="flex min-h-11 items-center gap-3 rounded-full px-3 text-sm font-medium text-muted hover:bg-elevated md:justify-center lg:justify-start" aria-label="Toggle theme">
          {resolvedTheme === "dark" ? <Sun size={22} /> : <Moon size={22} />} <span className="hidden lg:inline">{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
        <button onClick={() => setShortcutsOpen(true)} className="flex min-h-11 items-center gap-3 rounded-full px-3 text-sm font-medium text-muted hover:bg-elevated md:justify-center lg:justify-start"><Keyboard size={22} /> <span className="hidden lg:inline">Shortcuts (?)</span></button>
        {viewer && (
          <div className="flex items-center gap-2 rounded-full px-2 py-1.5 md:justify-center lg:justify-start">
            <Link href={`/u/${viewer.username}`} className="flex items-center gap-2"><Avatar src={viewer.avatarUrl} name={viewer.displayName} size={36} /><span className="hidden min-w-0 lg:block"><span className="block truncate text-sm font-semibold">{viewer.displayName}</span><span className="block truncate text-xs text-muted">@{viewer.username}</span></span></Link>
            <button aria-label="Sign out" onClick={() => api("/api/auth/logout", { method: "POST" }).then(() => { router.push("/"); router.refresh(); })} className="ml-auto hidden h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-elevated lg:flex"><SignOut size={18} /></button>
          </div>
        )}
      </div>
    </nav>
  );
}

/** Mobile bottom tab bar with a raised gradient Create button. */
export function TabBar() {
  const path = usePathname();
  const viewer = useViewer();
  const unread = useUiStore((s) => s.unread);
  const setComposerOpen = useUiStore((s) => s.setComposerOpen);
  const tabs = [
    { href: "/home", icon: House, label: "Home" },
    { href: "/search", icon: MagnifyingGlass, label: "Search" },
    null,
    { href: "/notifications", icon: Bell, label: "Notifications", badge: unread.notifications },
    { href: viewer ? `/u/${viewer.username}` : "/login", icon: null, label: "Profile" },
  ];
  return (
    <nav aria-label="Primary" className="glass tabbar-safe fixed inset-x-0 bottom-0 z-40 md:hidden">
      <ul className="flex items-end justify-around px-2 pt-1">
        {tabs.map((t, i) =>
          t === null ? (
            <li key="create" className="-mt-6">
              <button onClick={() => setComposerOpen(true)} aria-label="Create" className="sunset flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow active:scale-95"><Plus size={28} weight="bold" /></button>
            </li>
          ) : (
            <li key={t.href}>
              <Link href={t.href} aria-label={t.label} aria-current={path === t.href ? "page" : undefined} className={cn("relative flex h-14 w-14 flex-col items-center justify-center rounded-2xl", path === t.href ? "text-coral-deep dark:text-peach" : "text-muted")}>
                {t.icon ? <span className="relative"><t.icon size={26} weight={path === t.href ? "fill" : "duotone"} />{t.badge ? <Badge n={t.badge} /> : null}</span> : viewer ? <Avatar src={viewer.avatarUrl} name={viewer.displayName} size={28} /> : <GearSix size={26} />}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
