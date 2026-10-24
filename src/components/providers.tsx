"use client";
import { createContext, useContext, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/Toaster";
import { Preloader } from "@/components/animations/Preloader";
import { useUiStore } from "@/store/useUiStore";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useCursorGlow } from "@/hooks/useCursorGlow";
import { useRealtime } from "@/hooks/useRealtime";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ShortcutsDialog } from "@/components/layout/ShortcutsDialog";
import { ReportDialog } from "@/components/moderation/ReportDialog";

export type Viewer = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  isPrivate: boolean;
  reduceMotion: boolean;
  soundEnabled: boolean;
  accentColor: string;
  takeABreak: boolean;
  onboarded: boolean;
  interests: string[];
} | null;

const ViewerCtx = createContext<Viewer>(null);
export const useViewer = () => useContext(ViewerCtx);

function Effects({ viewer }: { viewer: Viewer }) {
  const reduced = useReducedMotion();
  const setReduce = useUiStore((s) => s.setReduceMotion);
  const setSound = useUiStore((s) => s.setSoundEnabled);
  useEffect(() => {
    if (viewer) {
      setReduce(viewer.reduceMotion);
      setSound(viewer.soundEnabled);
      document.documentElement.style.setProperty("--accent", viewer.accentColor);
    }
  }, [viewer, setReduce, setSound]);
  useCursorGlow();
  useRealtime(!!viewer);
  useKeyboardShortcuts();
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <Preloader />
      <Toaster />
      <ShortcutsDialog />
      {viewer && <ReportDialog />}
    </MotionConfig>
  );
}

export function Providers({ children, viewer }: { children: React.ReactNode; viewer: Viewer }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ViewerCtx.Provider value={viewer}>
        <Effects viewer={viewer} />
        {children}
      </ViewerCtx.Provider>
    </ThemeProvider>
  );
}
