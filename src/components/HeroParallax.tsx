"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * The /blog hero photo: scale and vertical offset grow with scroll depth,
 * same feel as the design reference. Skipped entirely under
 * `prefers-reduced-motion` — no listener attached, not just a no-op one —
 * so the image simply sits at its resting `scale(1.4)` (set in CSS).
 *
 * The same rAF loop also publishes `--hero-scroll` (raw scrollY) onto the
 * `.blog-hero` section, which `.blog-hero__copy` in public.css reads to
 * drift up and fade as the reader scrolls past — one listener drives both
 * effects instead of adding a second.
 */
export default function HeroParallax({ src, alt }: { src: string; alt: string }) {
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
      img.style.transform = `scale(${1.4 + y * 0.0002}) translateY(${y * 0.22}px)`;
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
    <Image
      ref={imgRef}
      src={src}
      alt={alt}
      fill
      priority
      sizes="100vw"
      className="blog-hero__img"
    />
  );
}
