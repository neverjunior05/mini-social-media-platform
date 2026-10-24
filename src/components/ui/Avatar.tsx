"use client";
import { useState } from "react";
import { cn, initials } from "@/lib/utils";

type Props = {
  src?: string | null;
  name: string;
  size?: number;
  ring?: "unseen" | "seen" | null;
  online?: boolean;
  className?: string;
};

/** Avatar with optional sunset story ring, online dot (mint) and breathing animation when online. */
export function Avatar({ src, name, size = 40, ring = null, online, className }: Props) {
  const [err, setErr] = useState(false);
  const inner = (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-elevated text-ink", online && "breathe")}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src && !err ? (
        <img src={src} alt="" width={size} height={size} loading="lazy" onError={() => setErr(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="sunset flex h-full w-full items-center justify-center font-heading font-bold text-white">{initials(name)}</span>
      )}
    </span>
  );
  return (
    <span className={cn("relative inline-block shrink-0", className)} aria-label={name}>
      {ring ? <span className={cn("story-ring inline-block", ring)}>{inner}</span> : inner}
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-mint" aria-label="online" />}
    </span>
  );
}
