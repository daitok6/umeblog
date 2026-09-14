"use client";

import { useEffect, useRef, type ImgHTMLAttributes } from "react";

/**
 * The home hero illustration: scale and vertical offset grow with scroll
 * depth, same feel as the design reference. Skipped entirely under
 * `prefers-reduced-motion` — no listener attached, not just a no-op one —
 * so the image simply sits at its resting `scale(1)` (set in CSS).
 *
 * The same rAF loop also publishes `--hero-scroll` (raw scrollY) onto the
 * `.blog-hero` section, which `.blog-hero__copy` in public.css reads to
 * drift up and fade as the reader scrolls past — one listener drives both
 * effects instead of adding a second.
 *
 * `imgProps` / `narrowSrcSet` come from `next/image`'s `getImageProps()`,
 * computed server-side in page.tsx so a desktop and a mobile illustration
 * (set independently in /admin/settings) can each get their own optimized
 * srcSet via a plain `<picture>` — art direction, not just a CSS crop.
 */
export default function HeroParallax({
  imgProps,
  narrowSrcSet,
  narrowMedia,
}: {
  imgProps: ImgHTMLAttributes<HTMLImageElement>;
  narrowSrcSet?: string;
  narrowMedia: string;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const img = imgRef.current;
    if (!img) return;
    const hero = img.closest<HTMLElement>(".blog-hero");

    let rafId: number | null = null;
    const apply = () => {
      rafId = null;
      const y = window.scrollY;
      img.style.transform = `scale(${1 + y * 0.0002}) translateY(${y * 0.22}px)`;
      hero?.style.setProperty("--hero-scroll", String(y));
    };
    const onScroll = () => {
      if (rafId == null) rafId = requestAnimationFrame(apply);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <picture>
      {narrowSrcSet && <source media={narrowMedia} srcSet={narrowSrcSet} />}
      {/* eslint-disable-next-line @next/next/no-img-element -- these are next/image's own generated props, from getImageProps() */}
      <img ref={imgRef} {...imgProps} />
    </picture>
  );
}
