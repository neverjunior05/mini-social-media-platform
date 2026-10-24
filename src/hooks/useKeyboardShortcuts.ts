"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/store/useUiStore";

/** Global shortcuts: J/K move between posts, L react, C comment, N new post, ? help, G+H home etc. */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const setComposerOpen = useUiStore((s) => s.setComposerOpen);
  useEffect(() => {
    let lastG = 0;
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const posts = () => Array.from(document.querySelectorAll<HTMLElement>("[data-post-id]"));
    const focused = () => document.activeElement?.closest<HTMLElement>("[data-post-id]") ?? null;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const list = posts();
      const cur = focused();
      const idx = cur ? list.indexOf(cur) : -1;
      switch (e.key) {
        case "?":
          setShortcutsOpen(true);
          break;
        case "j": {
          const next = list[Math.min(idx + 1, list.length - 1)];
          next?.focus();
          next?.scrollIntoView({ block: "center", behavior: "smooth" });
          break;
        }
        case "k": {
          const prev = list[Math.max(idx - 1, 0)];
          prev?.focus();
          prev?.scrollIntoView({ block: "center", behavior: "smooth" });
          break;
        }
        case "l":
          cur?.querySelector<HTMLButtonElement>("[data-action=react]")?.click();
          break;
        case "c":
          cur?.querySelector<HTMLButtonElement>("[data-action=comment]")?.click();
          break;
        case "n":
          e.preventDefault();
          setComposerOpen(true);
          break;
        case "g":
          lastG = Date.now();
          break;
        case "h":
          if (Date.now() - lastG < 800) router.push("/home");
          break;
        case "m":
          if (Date.now() - lastG < 800) router.push("/messages");
          break;
        case "Escape":
          setShortcutsOpen(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, setShortcutsOpen, setComposerOpen]);
}
