"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const PEBBLES = ["#FFA877", "#FF5E6C", "#E83E9B", "#7B5CFF", "#3DDBB0"];

/** Pebbles drop into a pond with ripples, settle into the logo, then a circular reveal shows the page. Once per session. */
export function Preloader() {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("pebble:preloaded")) return;
    sessionStorage.setItem("pebble:preloaded", "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), reduced ? 400 : 2100);
    return () => clearTimeout(t);
  }, [reduced]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-bg"
          exit={{ clipPath: "circle(0% at 50% 50%)", opacity: 0 }}
          initial={{ clipPath: "circle(150% at 50% 50%)" }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          aria-label="Loading Pebble"
          role="status"
        >
          <div className="relative h-40 w-40">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full border-2 border-coral/40"
                initial={{ width: 20, height: 20, x: -10, y: -10, opacity: 0 }}
                animate={{ width: 160, height: 160, x: -80, y: -80, opacity: [0, 0.6, 0] }}
                transition={{ delay: 0.6 + i * 0.25, duration: 1.2, ease: "easeOut" }}
              />
            ))}
            {PEBBLES.map((c, i) => {
              const angle = (i / PEBBLES.length) * Math.PI * 2;
              return (
                <motion.span
                  key={c}
                  className="absolute left-1/2 top-1/2 h-6 w-7 rounded-[50%_50%_45%_55%]"
                  style={{ background: c }}
                  initial={{ y: -220, x: Math.cos(angle) * 60 - 14, opacity: 0, rotate: -40 }}
                  animate={{ y: [-220, 0, Math.sin(angle) * 22 - 12], x: [Math.cos(angle) * 60 - 14, Math.cos(angle) * 40 - 14, Math.cos(angle) * 22 - 14], opacity: 1, rotate: 0 }}
                  transition={{ delay: i * 0.12, duration: 1.1, times: [0, 0.6, 1], ease: ["easeIn", "easeOut"] }}
                />
              );
            })}
            <motion.span className="absolute inset-x-0 bottom-0 text-center font-heading text-2xl font-extrabold tracking-tight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}>
              pebble
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
