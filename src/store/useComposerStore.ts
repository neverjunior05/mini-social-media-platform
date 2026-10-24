"use client";
import { create } from "zustand";

export type Attachment = { url: string; alt: string };
type ComposerState = {
  text: string;
  media: Attachment[];
  poll: { options: string[]; durationHours: number } | null;
  circleId: string | null;
  quoteOf: string | null;
  set: (p: Partial<Omit<ComposerState, "set" | "reset">>) => void;
  reset: () => void;
};
const initial = { text: "", media: [], poll: null, circleId: null, quoteOf: null };
export const useComposerStore = create<ComposerState>((set) => ({
  ...initial,
  set: (p) => set(p),
  reset: () => set(initial),
}));
