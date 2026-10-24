"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { toast } from "@/store/useUiStore";
import { useViewer } from "@/components/providers";
import { cn } from "@/lib/utils";

export type FollowState = "none" | "following" | "requested";

/** Morphs Follow → Following with a check; private accounts show "Requested". Optimistic with rollback. */
export function FollowButton({ username, initialState, isPrivate, small, onChange }: { username: string; initialState: FollowState; isPrivate?: boolean; small?: boolean; onChange?: (s: FollowState) => void }) {
  const [state, setState] = useState<FollowState>(initialState);
  const [busy, setBusy] = useState(false);
  const viewer = useViewer();
  const router = useRouter();
  const toggle = async () => {
    if (!viewer) return router.push("/login");
    if (busy) return;
    const prev = state;
    const optimistic: FollowState = state === "none" ? (isPrivate ? "requested" : "following") : "none";
    setState(optimistic);
    setBusy(true);
    try {
      const r = await api<{ state: FollowState }>(`/api/users/${username}/follow`, { method: "POST" });
      setState(r.state);
      onChange?.(r.state);
      if (r.state === "requested") toast("Request sent — they'll approve it soon");
    } catch (e) {
      setState(prev);
      toast({ title: (e as Error).message, kind: "error" });
    } finally {
      setBusy(false);
    }
  };
  const label = state === "following" ? "Following" : state === "requested" ? "Requested" : "Follow";
  return (
    <motion.button layout onClick={toggle} aria-pressed={state !== "none"} className={cn("flex items-center justify-center gap-1 rounded-full font-semibold transition-colors", small ? "min-h-9 px-3 text-xs" : "min-h-11 px-5 text-sm", state === "none" ? "bg-coral text-white hover:bg-coral-deep" : "border border-hairline bg-surface text-ink hover:border-coral hover:text-coral-deep")}>
      <AnimatePresence mode="popLayout" initial={false}>
        {state === "following" && <motion.span key="chk" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}><Check size={14} weight="bold" /></motion.span>}
      </AnimatePresence>
      <motion.span key={label} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>{label}</motion.span>
    </motion.button>
  );
}
