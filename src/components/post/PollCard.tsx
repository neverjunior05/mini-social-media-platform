"use client";
import { motion } from "framer-motion";
import { Check } from "@phosphor-icons/react";
import type { FeedPoll } from "@/lib/feed";
import { cn, timeAgo } from "@/lib/utils";

/** Poll with live-updating bars, one vote per user, text equivalent for screen readers. */
export function PollCard({ poll, onVote, disabled }: { poll: FeedPoll; onVote: (optionId: string) => void; disabled?: boolean }) {
  const ended = poll.closed || new Date(poll.endsAt) < new Date();
  const showResults = ended || !!poll.myVote;
  const endsIn = ended ? "Final results" : `Ends ${new Date(poll.endsAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
  return (
    <div className="space-y-2" role="group" aria-label={`Poll with ${poll.options.length} options, ${poll.totalVotes} votes. ${endsIn}.`}>
      {poll.options.map((o) => {
        const pct = poll.totalVotes ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
        const mine = poll.myVote === o.id;
        const top = showResults && poll.totalVotes > 0 && o.votes === Math.max(...poll.options.map((x) => x.votes));
        return (
          <button
            key={o.id}
            type="button"
            disabled={ended || disabled}
            onClick={() => onVote(o.id)}
            aria-label={`${o.text}${showResults ? `, ${pct}% (${o.votes} votes)` : ""}${mine ? ", your vote" : ""}`}
            className={cn("relative flex min-h-11 w-full items-center justify-between overflow-hidden rounded-2xl border px-4 py-2 text-left text-sm transition-colors", mine ? "border-coral" : "border-hairline", !ended && !disabled && "hover:bg-elevated")}
          >
            {showResults && (
              <motion.span className={cn("absolute inset-y-0 left-0 rounded-2xl", top ? "bg-coral/20" : "bg-elevated")} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} aria-hidden />
            )}
            <span className="relative flex items-center gap-2 font-medium">
              {mine && <Check size={16} weight="bold" className="text-coral-deep" />}
              {o.text}
            </span>
            {showResults && <span className="relative font-semibold tabular-nums">{pct}%</span>}
          </button>
        );
      })}
      <p className="text-xs text-muted">
        {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"} · {endsIn}
        {!ended && !poll.myVote && " · Tap to vote"}
      </p>
      <span className="sr-only">Ends {timeAgo(poll.endsAt)}</span>
    </div>
  );
}
