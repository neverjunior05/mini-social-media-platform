"use client";
import { useEffect } from "react";
import { useReducedMotion } from "./useReducedMotion";

/** Signature effect: soft sunset halo following the pointer on desktop (disabled for touch / reduced motion). */
export function useCursorGlow() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: "340px",
      height: "340px",
      pointerEvents: "none",
      zIndex: "0",
      borderRadius: "999px",
      background: "radial-gradient(circle, rgba(255,168,119,0.22), rgba(232,62,155,0.10) 45%, transparent 70%)",
      transform: "translate(-50%,-50%)",
      transition: "opacity .4s",
      opacity: "0",
      willChange: "transform",
    });
    document.body.appendChild(el);
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      el.style.opacity = "1";
      if (!raf) loop();
    };
    const loop = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.transform = `translate(${x - 170}px, ${y - 170}px)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    const leave = () => (el.style.opacity = "0");
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
      cancelAnimationFrame(raf);
      el.remove();
    };
  }, [reduced]);
}
