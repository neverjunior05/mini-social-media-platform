"use client";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react";
import { useUiStore } from "@/store/useUiStore";

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3" aria-live="polite" role="status">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            onClick={() => dismiss(t.id)}
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="glass pointer-events-auto flex max-w-sm items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-glow"
          >
            {t.kind === "error" ? <WarningCircle className="text-error" size={18} weight="fill" /> : t.kind === "success" ? <CheckCircle className="text-success" size={18} weight="fill" /> : <Info className="text-violet" size={18} weight="fill" />}
            {t.title}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
