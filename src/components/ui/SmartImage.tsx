"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = { src: string; alt: string; className?: string; aspect?: string; priority?: boolean; onDoubleClick?: () => void; sizes?: string };

/** Lazy image with reserved space, blur-up reveal, and a peach→lilac pebble fallback on error. */
export function SmartImage({ src, alt, className, aspect, priority, onDoubleClick }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-elevated", className)} style={aspect ? { aspectRatio: aspect } : undefined} onDoubleClick={onDoubleClick}>
      {!loaded && !error && <div className="skeleton absolute inset-0 rounded-none" aria-hidden />}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-peach/60 to-lilac" role="img" aria-label={alt || "Image unavailable"}>
          <PebbleMark className="h-10 w-10 opacity-70" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn("h-full w-full object-cover transition-[filter,opacity,transform] duration-700", loaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-105")}
        />
      )}
    </div>
  );
}

export function PebbleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFA877" />
          <stop offset="0.4" stopColor="#FF5E6C" />
          <stop offset="0.7" stopColor="#E83E9B" />
          <stop offset="1" stopColor="#7B5CFF" />
        </linearGradient>
      </defs>
      <path d="M12 38c-2-12 8-24 22-24s20 10 18 22-12 18-24 16S14 50 12 38z" fill="url(#pg)" />
      <ellipse cx="26" cy="26" rx="7" ry="4" fill="#fff" opacity=".45" transform="rotate(-20 26 26)" />
    </svg>
  );
}
