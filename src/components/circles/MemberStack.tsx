"use client";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";

/** Stacked avatars that fan out on hover. */
export function MemberStack({ members, total }: { members: { id: string; displayName: string; avatarUrl: string }[]; total: number }) {
  return (
    <motion.div className="flex items-center" initial="rest" whileHover="hover" aria-label={`${total} members`}>
      {members.map((m, i) => (
        <motion.span key={m.id} variants={{ rest: { x: i * -12 }, hover: { x: i * 2, rotate: (i - members.length / 2) * 3 } }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="rounded-full border-2 border-surface">
          <Avatar src={m.avatarUrl} name={m.displayName} size={30} />
        </motion.span>
      ))}
      <span className="ml-2 text-sm">{total} members</span>
    </motion.div>
  );
}
