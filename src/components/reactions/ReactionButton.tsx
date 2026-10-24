"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "@phosphor-icons/react";
import { REACTIONS } from "@/config/site";
import type { ReactionType } from "@/db/schema";
import { cn, formatCount } from "@/lib/utils";

type Props = {
  value: ReactionType | null;
  total: number;
  counts: Record<ReactionType, number>;
  onChange: (type: ReactionType | null) => void;
  compact?: boolean;
};

/** Per-reaction micro-animations (transform/opacity only). */
const MICRO: Record<ReactionType, { animate: Record<string, number[]>; transition?: Record<string, unknown> }> = {
  love: { animate: { y: [0, -14, 0], scale: [1, 1.35, 1] } },
  laugh: { animate: { rotate: [0, -14, 14, -8, 8, 0], scale: [1, 1.2, 1] } },
  wow: { animate: { scale: [1, 1.6, 0.9, 1.1, 1] } },
  hug: { animate: { scale: [1, 0.8, 1.25, 1] } },
  fire: { animate: { scale: [1, 1.25, 1.05, 1.3, 1], y: [0, -4, 0, -6, 0] } },
  clap: { animate: { scale: [1, 1.4, 1], rotate: [0, -20, 20, 0] } },
};

/** Press-and-hold (or hover) opens a spring-loaded tray; tap toggles Love. Fully keyboard operable. */
export function ReactionButton({ value, total, counts, onChange, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [flying, setFlying] = useState<ReactionType | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = REACTIONS.find((r) => r.type === value);

  const select = useCallback(
    (type: ReactionType | null) => {
      setOpen(false);
      if (type) {
        setFlying(type);
        setTimeout(() => setFlying(null), 700);
      }
      onChange(type);
    },
    [onChange],
  );

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    holdTimer.current = setTimeout(() => setOpen(true), 380);
  };
  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  const onClick = () => {
    if (open) return;
    select(value ? null : "love");
  };
  const topTypes = (Object.entries(counts) as [ReactionType, number][]).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover)").matches) hoverTimer.current = setTimeout(() => setOpen(true), 500);
      }}
      onMouseLeave={() => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setTimeout(() => setOpen((o) => (wrapRef.current?.matches(":hover") ? o : false)), 250);
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Pick a reaction"
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 6 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            className="glass absolute -top-14 left-0 z-20 flex origin-bottom-left items-center gap-1 rounded-full px-2 py-1.5 shadow-glow"
          >
            {REACTIONS.map((r, i) => (
              <motion.button
                key={r.type}
                role="menuitemradio"
                aria-checked={value === r.type}
                aria-label={r.label}
                title={r.label}
                initial={{ y: 16, opacity: 0, scale: 0.4 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 600, damping: 20 }}
                whileHover={{ scale: 1.45, y: -8 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  select(value === r.type ? null : r.type);
                }}
                className={cn("flex h-11 w-11 items-center justify-center rounded-full text-2xl", value === r.type && "bg-elevated")}
              >
                {r.emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        data-action="react"
        aria-pressed={!!value}
        aria-label={value ? `You reacted ${current?.label}. Press to remove, hold for more.` : "React. Hold for more reactions"}
        onPointerDown={onPointerDown}
        onPointerUp={clearHold}
        onPointerCancel={clearHold}
        onPointerLeave={clearHold}
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn("group relative flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors hover:bg-elevated", value ? "text-coral-deep dark:text-peach" : "text-muted")}
        style={value ? { color: current?.color } : undefined}
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {current ? (
              <motion.span key={current.type} className="text-xl leading-none" initial={{ scale: 0.4, opacity: 0 }} exit={{ scale: 0.4, opacity: 0 }} {...MICRO[current.type]} transition={{ duration: 0.55, ease: "easeOut" }}>
                {current.emoji}
              </motion.span>
            ) : (
              <motion.span key="heart" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                <Heart size={22} weight="duotone" />
              </motion.span>
            )}
          </AnimatePresence>
          {flying && (
            <motion.span className="pointer-events-none absolute text-xl" initial={{ y: 0, opacity: 1, scale: 1 }} animate={{ y: -36, opacity: 0, scale: 1.6 }} transition={{ duration: 0.65 }} aria-hidden>
              {REACTIONS.find((r) => r.type === flying)?.emoji}
            </motion.span>
          )}
        </span>
        {!compact && (
          <span className="flex items-center gap-1">
            {topTypes.length > 0 && (
              <span className="-space-x-1 hidden sm:flex" aria-hidden>
                {topTypes.map(([t]) => (
                  <span key={t} className="text-xs">
                    {REACTIONS.find((r) => r.type === t)?.emoji}
                  </span>
                ))}
              </span>
            )}
            <RollingNumber value={total} />
          </span>
        )}
      </button>
    </div>
  );
}

/** Counter that rolls vertically when it changes. */
export function RollingNumber({ value }: { value: number }) {
  return (
    <span className="relative inline-flex h-5 min-w-[1ch] overflow-hidden tabular-nums" aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
          {formatCount(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
