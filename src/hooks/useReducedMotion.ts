"use client";
import { useEffect, useState } from "react";
import { useUiStore } from "@/store/useUiStore";

/** True when either the OS prefers reduced motion or the user toggled it in Settings. */
export function useReducedMotion() {
  const userPref = useUiStore((s) => s.reduceMotion);
  const [os, setOs] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setOs(mq.matches);
    const fn = (e: MediaQueryListEvent) => setOs(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", userPref);
  }, [userPref]);
  return userPref || os;
}
