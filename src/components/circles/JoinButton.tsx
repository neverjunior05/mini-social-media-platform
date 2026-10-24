"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { toast } from "@/store/useUiStore";
import { cn } from "@/lib/utils";

export function JoinButton({ slug, isPrivate, initial, large }: { slug: string; isPrivate: boolean; initial: "none" | "member" | "pending"; large?: boolean }) {
  const [state, setState] = useState(initial);
  const [ripple, setRipple] = useState(false);
  const router = useRouter();
  const toggle = async () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
    try {
      const r = await api<{ state: "none" | "member" | "pending" }>(`/api/circles/${slug}/join`, { method: "POST" });
      setState(r.state);
      toast(r.state === "pending" ? "Request sent to the circle moderators" : r.state === "member" ? "Welcome to the circle!" : "You left the circle");
      router.refresh();
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    }
  };
  const label = state === "member" ? "Joined" : state === "pending" ? "Requested" : isPrivate ? "Request to join" : "Join";
  return (
    <button onClick={toggle} className={cn("relative overflow-hidden rounded-full font-semibold", large ? "min-h-11 px-5 text-sm" : "min-h-9 px-4 text-xs", state === "none" ? "bg-coral text-white hover:bg-coral-deep" : "border border-hairline bg-surface text-ink")}>
      {ripple && <motion.span className="absolute inset-0 rounded-full bg-white/40" initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2.5, opacity: 0 }} transition={{ duration: 0.6 }} aria-hidden />}
      <span className="relative">{label}</span>
    </button>
  );
}
