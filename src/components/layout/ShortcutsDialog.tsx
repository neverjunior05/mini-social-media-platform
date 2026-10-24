"use client";
import { Modal } from "@/components/ui/Modal";
import { useUiStore } from "@/store/useUiStore";

const KEYS = [
  ["J / K", "Next / previous post"],
  ["L", "React to focused post"],
  ["C", "Comment on focused post"],
  ["N", "New post"],
  ["G then H", "Go home"],
  ["G then M", "Go to messages"],
  ["?", "Show this help"],
  ["Esc", "Close dialogs"],
];
export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" size="sm">
      <dl className="divide-y divide-hairline text-sm">
        {KEYS.map(([k, d]) => (
          <div key={k} className="flex items-center justify-between py-2">
            <dt className="text-muted">{d}</dt>
            <dd><kbd className="rounded-lg border border-hairline bg-elevated px-2 py-1 font-mono text-xs">{k}</kbd></dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
