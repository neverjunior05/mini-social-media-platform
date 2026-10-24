import { SmartImage } from "@/components/ui/SmartImage";
import type { LinkPreview } from "@/db/schema";
import { LinkSimple } from "@/components/post/icons";

export function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer nofollow ugc" onClick={(e) => e.stopPropagation()} className="glass flex overflow-hidden rounded-[20px] transition-transform hover:-translate-y-0.5">
      {preview.image ? <SmartImage src={preview.image} alt="" className="h-28 w-28 shrink-0 sm:h-32 sm:w-44" /> : <div className="flex h-28 w-24 shrink-0 items-center justify-center bg-gradient-to-br from-peach/50 to-lilac text-violet"><LinkSimple /></div>}
      <div className="min-w-0 p-3">
        <p className="text-xs uppercase tracking-wide text-muted">{preview.siteName}</p>
        <p className="line-clamp-2 font-semibold">{preview.title}</p>
        <p className="line-clamp-2 text-sm text-muted">{preview.description}</p>
      </div>
    </a>
  );
}
