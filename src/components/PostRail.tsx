"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { formatDate } from "@/components/PostList";
import type { PostWithMeta } from "@/lib/repo/posts";

/**
 * A horizontally-scrolling shelf of posts, browsed by eye rather than
 * scanned by line (that's what the ruled `PostList` is for).
 *
 * Scrolling is entirely manual: native drag/trackpad/touch, prev/next
 * buttons, and Tab (each card is a plain link, so the browser scrolls focus
 * into view on its own). Nothing ever auto-advances. The track is
 * `tabIndex={0}` so it's directly keyboard-scrollable too (WCAG 2.1.1).
 */
export default function PostRail({
  title,
  subtitle,
  posts,
}: {
  title: string;
  subtitle?: string;
  posts: PostWithMeta[];
}) {
  const trackId = useId();
  const trackRef = useRef<HTMLUListElement | null>(null);
  const [scrollable, setScrollable] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      rafId.current = null;
      const { scrollLeft, scrollWidth, clientWidth } = track;
      setScrollable(scrollWidth > clientWidth + 1);
      setAtStart(scrollLeft <= 1);
      setAtEnd(scrollLeft + clientWidth >= scrollWidth - 1);
    };

    const onScroll = () => {
      if (rafId.current == null) rafId.current = requestAnimationFrame(measure);
    };

    measure();
    track.addEventListener("scroll", onScroll, { passive: true });
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(track);

    return () => {
      track.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [posts]);

  function scrollBy(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({
      left: direction * track.clientWidth * 0.9,
      behavior: reduced ? "auto" : "smooth",
    });
  }

  if (posts.length === 0) return null;

  return (
    <section className="rail">
      <div className="rail__head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <span className="kana-sub">{subtitle}</span> : null}
        </div>
        {scrollable ? (
          <div className="rail__nav">
            <button
              type="button"
              className="rail__btn"
              aria-label="前へ"
              aria-controls={trackId}
              disabled={atStart}
              onClick={() => scrollBy(-1)}
            >
              ←
            </button>
            <button
              type="button"
              className="rail__btn"
              aria-label="次へ"
              aria-controls={trackId}
              disabled={atEnd}
              onClick={() => scrollBy(1)}
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      <ul id={trackId} ref={trackRef} className="rail__track" tabIndex={0} aria-label={title}>
        {posts.map((p) => (
          <li key={p.id} className="rail__item">
            <Link href={`/p/${p.slug}`} className="card">
              <span className={p.cover ? "card__cover" : "card__cover card__cover--empty"}>
                {p.cover ? (
                  <Image
                    src={p.cover.url}
                    alt={p.cover.alt}
                    fill
                    sizes="(max-width: 768px) 72vw, 280px"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <span className="card__serial serial">
                    {p.serial != null ? String(p.serial).padStart(3, "0") : "—"}
                  </span>
                )}
              </span>
              <span className="card__title">{p.title || "無題"}</span>
              <span className="card__meta">
                <span className="label">{formatDate(p.publishedAt)}</span>
                {p.tags.length > 0 ? <span className="label">{p.tags[0].name}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
