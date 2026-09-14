"use client";

import { useEffect } from "react";

/**
 * Scroll-spy for the article sidebar's table of contents: highlights the
 * link for the section currently being read via `aria-current="true"`.
 *
 * Renders nothing — mirrors RevealScope/ReadingProgress's rAF-coalesced
 * passive-scroll pattern rather than IntersectionObserver, since "which
 * heading is the *last one* above the fold" is naturally a single top-to-
 * bottom scan on scroll, not a set of independent visibility events.
 *
 * `scope` is scoped to the desktop aside's TOC only (`.article__toc-m`'s
 * mobile `<details>` list is a separate, CSS-hidden copy of the same links —
 * spying on both would double-count matching hrefs).
 */
export default function TocSpy({ scope = ".article__aside", offset = 110 }: { scope?: string; offset?: number }) {
  useEffect(() => {
    const container = document.querySelector(scope);
    if (!container) return;

    const links = [...container.querySelectorAll<HTMLAnchorElement>(".toc__link")];
    if (links.length < 2) return;

    const targets = links
      .map((a) => document.getElementById(a.hash.slice(1)))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length < 2) return;

    let rafId: number | null = null;
    const measure = () => {
      rafId = null;
      let active = 0;
      targets.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= offset) active = i;
      });
      links.forEach((a, i) => {
        if (i === active) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    };
    const onScroll = () => {
      if (rafId == null) rafId = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [scope, offset]);

  return null;
}
