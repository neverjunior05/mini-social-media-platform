import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { circleMembers, circles, posts, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { canViewCircle } from "@/lib/permissions";
import { postList } from "@/lib/feed";
import { SmartImage } from "@/components/ui/SmartImage";
import { JoinButton } from "@/components/circles/JoinButton";
import { CircleFeed } from "@/components/circles/CircleFeed";
import { MemberStack } from "@/components/circles/MemberStack";
import { Lock } from "@/components/post/icons";
import { site } from "@/config/site";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [c] = await db.select().from(circles).where(eq(circles.slug, slug));
  if (!c) return { title: "Circle" };
  return { title: c.name, description: c.description, robots: c.isPrivate ? { index: false } : undefined, openGraph: { title: c.name, description: c.description, images: [c.coverUrl ?? `/api/og?title=${encodeURIComponent(c.name)}`] } };
}

export default async function CirclePage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const [c] = await db.select().from(circles).where(eq(circles.slug, slug));
  if (!c) notFound();
  const members = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl, role: circleMembers.role, status: circleMembers.status })
    .from(circleMembers)
    .innerJoin(users, eq(users.id, circleMembers.userId))
    .where(eq(circleMembers.circleId, c.id));
  const me = user ? members.find((m) => m.id === user.id) : undefined;
  const canView = await canViewCircle(user?.id ?? null, c);
  const initial = canView ? await postList({ viewerId: user?.id ?? null, cursor: null, where: [eq(posts.circleId, c.id)] }) : { items: [], nextCursor: null };
  const active = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "pending");
  const isMod = me && me.status === "active" && me.role !== "member";
  const jsonLd = !c.isPrivate ? { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Circles", item: `${site.url}/circles` }, { "@type": "ListItem", position: 2, name: c.name, item: `${site.url}/circles/${c.slug}` }] } : null;
  void and;
  return (
    <div className="space-y-4">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <div className="card overflow-hidden">
        <div className="relative h-44 overflow-hidden sm:h-56">
          {c.coverUrl ? <div className="kenburns h-full w-full"><SmartImage src={c.coverUrl} alt="" className="h-full w-full" priority /></div> : <div className="sunset h-full w-full" />}
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl">{c.name} {c.isPrivate && <Lock size={18} className="text-muted" />}</h1>
              <p className="mt-1 text-muted">{c.description}</p>
            </div>
            {user && <JoinButton slug={c.slug} isPrivate={c.isPrivate} initial={me?.status === "active" ? "member" : me?.status === "pending" ? "pending" : "none"} large />}
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-muted">
            <MemberStack members={active.slice(0, 8)} total={active.length} />
          </div>
          {c.rules && (
            <details className="mt-3 rounded-2xl bg-elevated/60 p-3 text-sm"><summary className="cursor-pointer font-semibold">Circle rules</summary><pre className="mt-2 whitespace-pre-wrap font-body text-muted">{c.rules}</pre></details>
          )}
        </div>
      </div>
      {isMod && pending.length > 0 && (
        <section className="card p-4"><h2 className="mb-2 text-base">Pending requests</h2><CircleFeed.Pending slug={c.slug} pending={pending} /></section>
      )}
      {canView ? (
        <CircleFeed slug={c.slug} circleId={c.id} canPost={me?.status === "active"} initial={JSON.parse(JSON.stringify(initial))} />
      ) : (
        <div className="card p-8 text-center"><p className="font-accent text-2xl">This circle is private</p><p className="mt-1 text-sm text-muted">Request to join and a moderator will approve you. {!user && <Link href="/login" className="font-semibold text-coral-deep">Sign in</Link>}</p></div>
      )}
      <section className="card p-4">
        <h2 className="mb-2 text-base">Members ({active.length})</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {active.map((m) => <li key={m.id}><Link href={`/u/${m.username}`} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-elevated"><img src={m.avatarUrl} alt="" className="h-8 w-8 rounded-full" loading="lazy" /><span className="min-w-0 text-sm"><span className="block truncate font-semibold">{m.displayName}</span>{m.role !== "member" && <span className="text-[10px] uppercase text-violet">{m.role}</span>}</span></Link></li>)}
        </ul>
      </section>
    </div>
  );
}
