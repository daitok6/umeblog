"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ResponsiveName from "@/components/ResponsiveName";

/**
 * Sticky, auto-hiding, always-transparent top bar: hidden on scroll-down,
 * shown on any scroll-up, and always shown near the top of the page. There
 * is no background at any scroll position — only the words, so legibility
 * comes from `text-shadow` (see public.css) rather than a solid bar.
 *
 * The scroll handler is `{ passive: true }` and coalesced through a single
 * in-flight `requestAnimationFrame`, so at most one state update happens per
 * frame no matter how many scroll events fire.
 *
 * One extra treatment: whenever a `.blog-hero` (the full-bleed photo on `/`)
 * is still behind the bar, the words switch to a cream/dark-shadow
 * combination tuned for the photo instead of the cream page background.
 * This is keyed on the hero's own rect, not on scroll position or route, so
 * it stays correct the moment scrolling clears the hero — not just once any
 * scrolling has happened.
 */
export default function SiteHeader({ wide, narrow }: { wide: string; narrow: string }) {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [overHero, setOverHero] = useState(pathname === "/");
  const lastY = useRef(0);
  const rafId = useRef<number | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    lastY.current = window.scrollY;

    const measure = () => {
      rafId.current = null;
      const y = window.scrollY;

      const hero = document.querySelector(".blog-hero");
      const headerH = headerRef.current?.offsetHeight ?? 0;
      setOverHero(!!hero && hero.getBoundingClientRect().bottom > headerH);

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

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [pathname]);

  return (
    <header
      ref={headerRef}
      className={[
        "site-header",
        hidden ? "site-header--hidden" : "",
        overHero ? "site-header--overlay" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="container site-header__inner">
        <Link href="/" className="site-header__logo">
          <ResponsiveName wide={wide} narrow={narrow} />
        </Link>
        <nav className="site-header__nav">
          <Link className="nav-link" href="/">
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
