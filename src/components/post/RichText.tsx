import Link from "next/link";
import { tokenize } from "@/lib/utils";

/** Renders user text safely as React nodes: hashtags, mentions and links become anchors; nothing is injected as HTML. */
export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <p className={`break-anywhere whitespace-pre-wrap leading-[1.55] ${className ?? ""}`}>
      {tokenize(text).map((t, i) => {
        if (t.kind === "hashtag")
          return (
            <Link key={i} href={`/tag/${encodeURIComponent(t.value.toLowerCase())}`} className="font-medium text-coral-deep hover:underline dark:text-peach" onClick={(e) => e.stopPropagation()}>
              #{t.value}
            </Link>
          );
        if (t.kind === "mention")
          return (
            <Link key={i} href={`/u/${t.value.toLowerCase()}`} className="font-medium text-[#1a7fb8] hover:underline dark:text-sky" onClick={(e) => e.stopPropagation()}>
              @{t.value}
            </Link>
          );
        if (t.kind === "link")
          return (
            <a key={i} href={t.value} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-[#1a7fb8] underline-offset-2 hover:underline dark:text-sky" onClick={(e) => e.stopPropagation()}>
              {t.value.replace(/^https?:\/\//, "").slice(0, 48)}
              {t.value.replace(/^https?:\/\//, "").length > 48 ? "…" : ""}
            </a>
          );
        return <span key={i}>{t.value}</span>;
      })}
    </p>
  );
}
