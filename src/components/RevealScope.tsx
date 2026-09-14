"use client";

import { useEffect } from "react";

/**
 * Applies the same `[data-reveal]` scroll-reveal behaviour as `useReveal`
 * (see src/lib/useReveal.ts for the full contract — reduced-motion
 * early-return, DOM-class-gated re-observation, etc.) to a server-rendered
 * page section that a client component can't wrap directly.
 *
 * Renders nothing and takes no space — pass a CSS selector for the section
 * that already exists in the server-rendered markup around it, e.g.
 * `<RevealScope root=".article" />` placed anywhere inside `<article
 * className="article">`.
 */
export default function RevealScope({ root }: { root: string }) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const scope = document.querySelector(root);
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
      const delay = el.dataset.revealDelay ?? String((i % 6) * 0.08);
      el.style.transitionDelay = `${delay}s`;
      el.classList.add("reveal", "pre-reveal");
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [root]);

  return null;
}
