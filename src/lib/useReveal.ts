"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Scroll-reveal via IntersectionObserver, scoped to a container ref.
 *
 * Every element inside the container carrying `data-reveal` gets a
 * `pre-reveal` class (opacity 0, see `.reveal.pre-reveal` in public.css)
 * until it crosses the viewport, then `is-visible` is added and it is
 * unobserved. `data-reveal-delay` (seconds, as a plain number string) staggers
 * the transition if present; otherwise elements reveal together.
 *
 * Three properties matter here, carried over from the original PostList
 * implementation this was extracted from:
 *
 * - Skipped entirely under `prefers-reduced-motion` — no observer is created
 *   at all, so a slow first paint can never strand an element at opacity 0.
 * - Re-runs whenever `deps` changes, so elements that appear later (e.g.
 *   after a filter) still get observed.
 * - Re-observation is gated on the DOM class (`is-visible`), not a ref that
 *   outlives one effect run. This matters under React's dev-mode
 *   double-invoke: a throwaway first mount's observer gets disconnected by
 *   its cleanup before its (async) initial callback can fire, and only the
 *   second mount's observer sticks around — a ref-based "already handled"
 *   guard would wrongly skip that survivor because the first pass already
 *   marked it done.
 */
export function useReveal<T extends HTMLElement>(deps: unknown[] = []): RefObject<T | null> {
  const scopeRef = useRef<T | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const scope = scopeRef.current;
    if (!scope) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );

    const targets = scope.querySelectorAll<HTMLElement>("[data-reveal]");
    targets.forEach((el, i) => {
      if (el.classList.contains("is-visible")) return;
      const delay = el.dataset.revealDelay ?? String((i % 12) * 0.06);
      el.style.transitionDelay = `${delay}s`;
      el.classList.add("reveal", "pre-reveal");
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, deps);

  return scopeRef;
}
