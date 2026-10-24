"use client";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

/** Soft crossfade + slight vertical shift between routes. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: "easeOut" }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
