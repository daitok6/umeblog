"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ResponsiveName from "@/components/ResponsiveName";

/**
 * Sticky, auto-hiding top bar: hidden on scroll-down, shown on any
 * scroll-up, and always shown near the top of the page.
 *
 * The scroll handler is `{ passive: true }` and coalesced through a single
 * in-flight `requestAnimationFrame`, so at most one state update happens per
 * frame no matter how many scroll events fire.
 */
export default function SiteHeader({ wide, narrow }: { wide: string; narrow: string }) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    lastY.current = window.scrollY;

    const measure = () => {
      rafId.current = null;
      const y = window.scrollY;
      setScrolled(y > 0);

      if (y <= 80) {
        setHidden(false);
      } else if (y > lastY.current + 4) {
        setHidden(true);
      } else if (y < lastY.current - 4) {
        setHidden(false);
      }
      lastY.current = y;
    };

    const onScroll = () => {
      if (rafId.current == null) {
        rafId.current = requestAnimationFrame(measure);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <header
      className={[
        "site-header",
        scrolled ? "site-header--scrolled" : "",
        hidden ? "site-header--hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="container site-header__inner">
        <Link href="/" className="site-header__logo">
          <ResponsiveName wide={wide} narrow={narrow} />
        </Link>
        <nav className="site-header__nav">
          <Link className="nav-link" href="/blog">
            Blog
          </Link>
          <Link className="nav-link" href="/about">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
