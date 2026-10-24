"use client";
import { create } from "zustand";

export type Toast = { id: number; title: string; kind?: "success" | "error" | "info" };
type ToastInput = Omit<Toast, "id">;

type UiState = {
  toasts: Toast[];
  toast: (t: ToastInput | string) => void;
  dismissToast: (id: number) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (v: boolean) => void;
  unread: { notifications: number; messages: number };
  setUnread: (u: Partial<{ notifications: number; messages: number }>) => void;
  composerOpen: boolean;
  setComposerOpen: (v: boolean) => void;
  reportTarget: { type: "post" | "comment" | "user" | "message"; id: string } | null;
  setReportTarget: (t: UiState["reportTarget"]) => void;
};

let toastId = 0;
export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  toast: (t) => {
    const id = ++toastId;
    const input = typeof t === "string" ? { title: t } : t;
    set((s) => ({ toasts: [...s.toasts, { id, ...input }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  reduceMotion: false,
  setReduceMotion: (v) => set({ reduceMotion: v }),
  soundEnabled: false,
  setSoundEnabled: (v) => set({ soundEnabled: v }),
  shortcutsOpen: false,
  setShortcutsOpen: (v) => set({ shortcutsOpen: v }),
  unread: { notifications: 0, messages: 0 },
  setUnread: (u) => set((s) => ({ unread: { ...s.unread, ...u } })),
  composerOpen: false,
  setComposerOpen: (v) => set({ composerOpen: v }),
  reportTarget: null,
  setReportTarget: (t) => set({ reportTarget: t }),
}));

export const toast = (t: ToastInput | string) => useUiStore.getState().toast(t);
