"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, X } from "@phosphor-icons/react";
import { SmartImage } from "@/components/ui/SmartImage";
import { cn } from "@/lib/utils";

type Media = { id: string; url: string; alt: string };

/** 1–4 image grid with 2px gaps, rounded outer corners, double-tap heart burst and a full-screen viewer. */
export function MediaGrid({ media, onDoubleLike, priority }: { media: Media[]; onDoubleLike?: () => void; priority?: boolean }) {
  const [burst, setBurst] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [tapAt, setTapAt] = useState(0);
  if (!media.length) return null;
  const n = media.length;
  const tap = (i: number) => {
    const now = Date.now();
    if (now - tapAt < 300) {
      setBurst(true);
      setTimeout(() => setBurst(false), 800);
      onDoubleLike?.();
    } else {
      setTimeout(() => {
        if (Date.now() - now >= 300) setViewer(i);
      }, 320);
    }
    setTapAt(now);
  };
  const layout = n === 1 ? "grid-cols-1" : n === 2 ? "grid-cols-2" : "grid-cols-2";
  return (
    <>
      <div className={cn("relative grid gap-[2px] overflow-hidden rounded-[20px]", layout)} style={{ aspectRatio: n === 1 ? "4 / 3" : "16 / 10" }}>
        {media.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => tap(i)}
            aria-label={m.alt ? `Open image: ${m.alt}` : "Open image"}
            className={cn("relative block h-full w-full overflow-hidden", n === 3 && i === 0 && "row-span-2")}
          >
            <SmartImage src={m.url} alt={m.alt} className="h-full w-full" priority={priority && i === 0} />
            {m.alt && <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">ALT</span>}
          </button>
        ))}
        <AnimatePresence>
          {burst && (
            <motion.div className="pointer-events-none absolute inset-0 flex items-center justify-center" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.2, 1, 1.4] }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} aria-hidden>
              <Heart size={120} weight="fill" className="text-white drop-shadow-[0_6px_20px_rgba(255,77,109,.6)]" style={{ color: "#FF4D6D" }} />
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.span key={i} className="absolute h-2 w-2 rounded-full" style={{ background: ["#FFA877", "#FF5E6C", "#E83E9B", "#7B5CFF"][i % 4] }} initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: Math.cos((i / 8) * Math.PI * 2) * 90, y: Math.sin((i / 8) * Math.PI * 2) * 90, opacity: 0 }} transition={{ duration: 0.7 }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {viewer !== null && (
          <motion.div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewer(null)} role="dialog" aria-label="Image viewer">
            <button className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Close" onClick={() => setViewer(null)}>
              <X size={22} />
            </button>
            <motion.img
              key={viewer}
              src={media[viewer].url}
              alt={media[viewer].alt}
              className="max-h-[90dvh] max-w-[95vw] rounded-2xl object-contain"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              drag={n > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) setViewer((v) => Math.min((v ?? 0) + 1, n - 1));
                if (info.offset.x > 80) setViewer((v) => Math.max((v ?? 0) - 1, 0));
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {media[viewer].alt && <p className="absolute bottom-6 max-w-lg px-4 text-center text-sm text-white/80">{media[viewer].alt}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
