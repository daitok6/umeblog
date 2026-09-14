"use client";

import { useEffect, useRef } from "react";

/**
 * Thin fixed bar at the top of an article tracking scroll depth through the
 * document. Driven by `transform: scaleX()` (never `width`) so it can never
 * exceed the viewport regardless of rounding — see tests/mobile.spec.ts,
 * which fails on anything wider than the viewport.
 *
 * Same rAF-coalesced passive-scroll pattern as HeroParallax/SiteHeader, and
 * skipped entirely under `prefers-reduced-motion` for the same reason: no
 * listener attached, not just a no-op one.
 */
export default function ReadingProgress() {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const bar = barRef.current;
    if (!bar) return;

    let rafId: number | null = null;
    const apply = () => {
      rafId = null;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (rafId == null) rafId = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="reading-progress" aria-hidden="true">
      <div className="reading-progress__bar" ref={barRef} />
    </div>
  );
}
