"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PostWithMeta } from "@/lib/repo/posts";
import { formatDate } from "@/lib/formatDate";

type Props = {
  posts: PostWithMeta[];
};

/**
 * Home page's 注目！ rail: author-flagged posts (the 注目 toggle in
 * PostSidebar), newest first — see src/app/(public)/page.tsx. Purely a
 * horizontal scroll container: swipe on touch, native keyboard scrolling,
 * and these prev/next buttons all move the same track, so scrollLeft is the
 * one source of truth for position. Never auto-advances — no timer, no
 * dots, nothing moves unless the reader moves it.
 */
export default function FeaturedRail({ posts }: Props) {
  const trackRef = useRef<HTMLUListElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const update = () => {
      setAtStart(track.scrollLeft <= 1);
      setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 1);
    };
    update();

    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [posts]);

  function scrollByCard(dir: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    // Same reduced-motion check as HeroParallax — a flat jump instead of a
    // smooth scroll when the reader has asked for less motion.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({
      left: dir * track.clientWidth * 0.85,
      behavior: reduced ? "auto" : "smooth",
    });
  }

  if (posts.length === 0) return null;

  return (
    <section className="featured-rail" aria-labelledby="featured-rail-heading">
      <div className="container featured-rail__inner">
        <div className="featured-rail__head">
          <h2 className="blog-section-heading" id="featured-rail-heading">
            注目！<span className="blog-section-heading__label">featured</span>
          </h2>
          <div className="featured-rail__nav">
            <button
              type="button"
              className="featured-rail__arrow"
              onClick={() => scrollByCard(-1)}
              disabled={atStart}
              aria-label="前の記事"
            >
              ‹
            </button>
            <button
              type="button"
              className="featured-rail__arrow"
              onClick={() => scrollByCard(1)}
              disabled={atEnd}
              aria-label="次の記事"
            >
              ›
            </button>
          </div>
        </div>

        <ul
          className="featured-rail__track"
          ref={trackRef}
          tabIndex={0}
          aria-label="注目の記事"
        >
          {posts.map((p) => (
            // Same stretched-link restructuring as PostList.tsx: the tag is
            // its own link now, so it can no longer live inside the title's
            // <a>. See public.css's ".blog-card__link" comment.
            <li key={p.id} className="featured-card">
              <span
                className={
                  p.cover
                    ? "featured-card__cover"
                    : "featured-card__cover featured-card__cover--empty"
                }
              >
                {p.cover ? (
                  <Image
                    src={p.cover.url}
                    alt={p.cover.alt}
                    fill
                    sizes="(max-width: 768px) 82vw, 320px"
                    style={{ objectFit: "cover" }}
                  />
                ) : null}
              </span>
              <span className="featured-card__body">
                {p.tags[0] ? (
                  <span className="blog-card__tags">
                    <Link href={`/tag/${p.tags[0].slug}`} className="blog-card__tag">
                      ({p.tags[0].name})
                    </Link>
                  </span>
                ) : null}
                <Link href={`/p/${p.slug}`} className="blog-card__link featured-card__title">
                  {p.title || "無題"}
                </Link>
                <span className="blog-card__date">{formatDate(p.publishedAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
