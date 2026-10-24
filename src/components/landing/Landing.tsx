"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useScroll, useSpring, useTransform, useInView, AnimatePresence } from "framer-motion";
import { Heart, ChatCircle, ShieldCheck, Sparkle, Clock, UsersThree, Moon, Hand } from "@phosphor-icons/react";
import { PebbleMark } from "@/components/ui/SmartImage";
import { media, credits } from "@/config/media";
import { REACTIONS } from "@/config/site";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

const DEMO_CARDS = [
  { name: "Theo M.", handle: "theo_trails", text: "Sat in a cloud on the ridge today. Would recommend. #hiking", img: media.landing.heroCollage[1], seed: "theo_trails" },
  { name: "Hana K.", handle: "hana_art", text: "Glaze tiles out of the kiln — one is perfect sea-glass green 🌊", img: media.landing.heroCollage[0], seed: "hana_art" },
  { name: "Ozzie B.", handle: "ozzie_dog", text: "Biscuit found a stick twice his size. Hero.", img: media.landing.heroCollage[2], seed: "ozzie_dog" },
];

const WORDS = ["A", "calmer,", "prettier", "place", "for", "small", "circles."];

export function Landing({ loggedIn }: { loggedIn: boolean }) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  useEffect(() => {
    if (reduced) return;
    const h = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 2);
      my.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", h, { passive: true });
    return () => window.removeEventListener("pointermove", h);
  }, [reduced, mx, my]);

  return (
    <div className="relative overflow-x-clip">
      {/* Nav */}
      <header className="glass sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-heading text-xl font-extrabold"><PebbleMark className="h-8 w-8" /> pebble</Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link href="/discover" className="hidden rounded-full px-3 py-2 hover:bg-elevated sm:inline">Discover</Link>
            <Link href="/circles" className="hidden rounded-full px-3 py-2 hover:bg-elevated sm:inline">Circles</Link>
            {loggedIn ? <Link href="/home" className="btn-primary">Open Pebble</Link> : <><Link href="/login" className="rounded-full px-3 py-2 hover:bg-elevated">Sign in</Link><Link href="/register" className="btn-primary">Join free</Link></>}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="aurora relative">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-14 lg:grid-cols-2 lg:pt-24">
          <div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pill mb-4 inline-flex items-center gap-1 bg-surface/80"><Sparkle size={14} weight="fill" className="text-magenta" /> No algorithmic outrage. No endless scroll.</motion.p>
            <h1 className="font-heading text-[clamp(2.6rem,7vw,5rem)] font-extrabold leading-[0.98] tracking-tight" aria-label={WORDS.join(" ")}>
              {WORDS.map((w, i) => (
                <motion.span key={i} className={cn("mr-[0.22em] inline-block", i >= 1 && i <= 2 && "sunset-text")} initial={{ opacity: 0, y: 30, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 200, damping: 20 }} aria-hidden>
                  {w}
                </motion.span>
              ))}
            </h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-5 max-w-md text-lg text-muted">
              Pebble is a tiny social app for friends, classmates and hobby circles. Share short posts, photos, polls and 24-hour stories. React with feeling. Chat in real time. Then get on with your day.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="mt-7 flex flex-wrap gap-3">
              <Link href={loggedIn ? "/home" : "/register"} className="btn-primary text-base">Start your circle</Link>
              <Link href="/login" className="btn-ghost text-base">Try a demo account</Link>
            </motion.div>
            <p className="mt-4 text-xs text-muted">Demo platform · all accounts and posts are fictional · free & open source</p>
          </div>

          {/* Floating collage */}
          <div className="relative mx-auto h-[460px] w-full max-w-md" aria-hidden>
            {DEMO_CARDS.map((c, i) => {
              const depth = (i + 1) * 10;
              return (
                <motion.div
                  key={c.handle}
                  style={{ x: useTransform(sx, (v) => v * depth), y: useTransform(sy, (v) => v * depth), top: `${i * 26}%`, left: `${(i % 2) * 28}%`, zIndex: 3 - i }}
                  initial={{ opacity: 0, y: 40, rotate: i % 2 ? 4 : -4 }}
                  animate={{ opacity: 1, y: [0, -8, 0], rotate: i % 2 ? 3 : -3 }}
                  transition={{ opacity: { delay: 0.3 + i * 0.15 }, y: { duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: i } }}
                  className="card absolute w-64 p-3"
                >
                  <div className="mb-2 flex items-center gap-2"><img src={media.avatars.dicebear("notionists", c.seed)} alt="" className="h-8 w-8 rounded-full" /><span className="text-sm font-semibold">{c.name}</span><span className="text-xs text-muted">@{c.handle}</span></div>
                  <p className="mb-2 text-sm">{c.text}</p>
                  <img src={c.img} alt="" className="h-28 w-full rounded-xl object-cover" loading="lazy" />
                </motion.div>
              );
            })}
            {REACTIONS.slice(0, 4).map((r, i) => (
              <motion.span key={r.type} style={{ x: useTransform(sx, (v) => v * -20 * (i + 1)), y: useTransform(sy, (v) => v * -15), right: `${i * 18}%`, bottom: `${8 + i * 14}%` }} animate={{ y: [0, -10, 0] }} transition={{ duration: 3 + i, repeat: Infinity }} className="glass absolute flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-glow">
                {r.emoji}
              </motion.span>
            ))}
            {/* small 3D-ish pebble */}
            <motion.div className="absolute -left-6 bottom-6 h-24 w-28 rounded-[50%_50%_45%_55%/60%_55%_45%_40%]" style={{ background: "var(--sunset)", boxShadow: "inset -12px -14px 30px rgba(42,23,34,.35), inset 10px 10px 24px rgba(255,255,255,.45), 0 20px 40px -10px rgba(232,62,155,.35)", rotateX: useTransform(sy, (v) => v * 12), rotateY: useTransform(sx, (v) => v * -12) }} animate={{ rotate: [0, 4, 0] }} transition={{ duration: 8, repeat: Infinity }} />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Clock, t: "Chronological, always", d: "Following is newest-first. Discover explains its ranking on every card." },
          { icon: Hand, t: "You're all caught up", d: "A gentle stop instead of an infinite pit. Go touch grass." },
          { icon: ShieldCheck, t: "Safety built in", d: "Block, mute, muted words, Take-a-break, human moderation and transparent appeals." },
          { icon: Moon, t: "Sunset Glass", d: "Warm light mode, plum-night dark mode, reduce-motion respected everywhere." },
        ].map((v, i) => (
          <motion.div key={v.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.08 }} className="card p-5">
            <v.icon size={28} weight="duotone" className="text-coral-deep dark:text-peach" />
            <h3 className="mt-3 text-lg">{v.t}</h3>
            <p className="text-sm text-muted">{v.d}</p>
          </motion.div>
        ))}
      </section>

      <HowItFeels />
      <DemoFeed />
      <Stats />

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">Bring your <span className="sunset-text">people</span>.</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">Students, friend groups, hobby clubs, small creators. Free, open source, and yours to self-host.</p>
        <Link href={loggedIn ? "/home" : "/register"} className="btn-primary mt-6 inline-block text-base">Create your account</Link>
      </section>

      <footer className="border-t border-hairline bg-surface/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-3">
          <div><p className="flex items-center gap-2 font-heading text-lg font-extrabold"><PebbleMark className="h-6 w-6" /> pebble</p><p className="mt-2 text-muted"><strong>Demo platform.</strong> Every seeded user, post, photo and message is fictional test data. No real people are depicted.</p></div>
          <div><p className="font-semibold">Links</p><ul className="mt-2 space-y-1 text-muted"><li><Link href="/policies" className="hover:underline">Community guidelines & policies</Link></li><li><Link href="/discover" className="hover:underline">Discover</Link></li><li><Link href="/circles" className="hover:underline">Circles</Link></li></ul></div>
          <div id="credits"><p className="font-semibold">Credits</p><ul className="mt-2 space-y-1 text-muted">{credits.map((c) => <li key={c.name}><a href={c.url} className="hover:underline">{c.name}</a> · {c.license}</li>)}</ul></div>
        </div>
      </footer>
    </div>
  );
}

/** Pinned section: one card transforms through Share → React → Reply → Chat as you scroll. */
function HowItFeels() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [stage, setStage] = useState(0);
  useEffect(() => scrollYProgress.on("change", (v) => setStage(Math.min(3, Math.floor(v * 4)))), [scrollYProgress]);
  const stages = [
    { k: "Share", d: "Short text, up to four photos with alt text, polls, link previews." },
    { k: "React", d: "Six expressive reactions with their own tiny animations. Hold for the tray." },
    { k: "Reply", d: "Two-level threads that stay readable. No quote-dunking culture." },
    { k: "Chat", d: "Real-time DMs and small groups with typing dots and read receipts." },
  ];
  return (
    <section ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-dvh items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">How Pebble feels</p>
            <div className="mt-3 space-y-4">
              {stages.map((s, i) => (
                <motion.div key={s.k} animate={{ opacity: stage === i ? 1 : 0.35, x: stage === i ? 0 : -6 }} className="flex gap-3">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading font-bold", stage === i ? "sunset text-white" : "bg-elevated")}>{i + 1}</span>
                  <div><h3 className="text-2xl">{s.k}</h3><p className="text-muted">{s.d}</p></div>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div layout className="card mx-auto w-full max-w-sm p-4" transition={{ type: "spring", stiffness: 200, damping: 26 }}>
            <div className="flex items-center gap-2"><img src={media.avatars.dicebear("lorelei", "noor_reads")} alt="" className="h-10 w-10 rounded-full" /><div><p className="text-sm font-semibold">Noor H.</p><p className="text-xs text-muted">@noor_reads · 2m</p></div></div>
            <p className="mt-2 text-[15px]">Library smell &gt; candle smell. No notes. #books</p>
            <img src={media.posts.bookstore[0]} alt="" className="mt-2 h-40 w-full rounded-2xl object-cover" loading="lazy" />
            <AnimatePresence mode="wait">
              {stage >= 1 && (
                <motion.div key="react" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2">
                  {REACTIONS.map((r, i) => <motion.span key={r.type} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05, type: "spring" }} className="text-xl">{r.emoji}</motion.span>)}
                  <span className="ml-auto text-sm font-semibold text-coral-deep">24</span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {stage >= 2 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-2 border-t border-hairline pt-3 text-sm">
                  <p><span className="font-semibold">Wren</span> Big agree. Adding to my list 📚</p>
                  <p className="ml-5 text-muted"><span className="font-semibold text-ink">Noor</span> Come to the reading circle Thursday!</p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {stage >= 3 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 space-y-1.5 rounded-2xl bg-elevated p-3 text-sm">
                  <p className="w-fit rounded-2xl bg-surface px-3 py-1.5">Thursday works! 7pm?</p>
                  <p className="sunset ml-auto w-fit rounded-2xl px-3 py-1.5 text-white">Perfect, see you there ✨</p>
                  <span className="flex gap-0.5 pl-2">{[0, 1, 2].map((i) => <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />)}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** Auto-playing demo feed: reactions and comments animate in on a loop. Clearly labeled demo. */
function DemoFeed() {
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20%" });
  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setTick((x) => x + 1), 1800);
    return () => clearInterval(t);
  }, [inView]);
  const reacts = ["❤️", "🔥", "👏", "😂", "🤗", "😮"];
  return (
    <section ref={ref} className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between"><h2 className="text-3xl">A feed that breathes</h2><span className="pill bg-warning/20 text-xs">Demo · simulated activity</span></div>
      <div className="grid gap-4 md:grid-cols-3">
        {DEMO_CARDS.map((c, i) => (
          <motion.div key={c.handle} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="card p-4">
            <div className="flex items-center gap-2"><img src={media.avatars.dicebear("adventurer", c.seed)} alt="" className="h-9 w-9 rounded-full" /><span className="text-sm font-semibold">{c.name}</span></div>
            <p className="my-2 text-sm">{c.text}</p>
            <img src={c.img} alt="" className="h-36 w-full rounded-2xl object-cover" loading="lazy" />
            <div className="mt-3 flex items-center gap-2 text-sm">
              <AnimatePresence mode="popLayout">
                <motion.span key={tick + i} initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 20 }} className="text-xl">{reacts[(tick + i) % reacts.length]}</motion.span>
              </AnimatePresence>
              <span className="font-semibold text-coral-deep">{12 + ((tick + i * 3) % 9)}</span>
              <span className="ml-auto flex items-center gap-1 text-muted"><ChatCircle size={16} /> {3 + ((tick + i) % 4)}</span>
            </div>
            <AnimatePresence>{(tick + i) % 3 === 0 && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 rounded-xl bg-peach/20 px-2 py-1 text-xs">💬 “This made my morning.”</motion.p>}</AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, [inView, to]);
  return <span ref={ref}>{v.toLocaleString()}{suffix}</span>;
}

function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-10">
      <div className="card grid gap-6 p-8 sm:grid-cols-4">
        {[[30, "fictional members", UsersThree], [120, "seeded posts", Heart], [6, "circles", Sparkle], [0, "ads, forever", ShieldCheck]].map(([n, l, Icon]) => {
          const I = Icon as typeof Heart;
          return (
            <div key={l as string} className="text-center">
              <I size={24} weight="duotone" className="mx-auto text-violet" />
              <p className="font-heading text-4xl font-extrabold"><Counter to={n as number} /></p>
              <p className="text-sm text-muted">{l as string}</p>
            </div>
          );
        })}
        <p className="col-span-full text-center text-xs text-muted">Demo numbers from the local seed — not real usage.</p>
      </div>
    </section>
  );
}
