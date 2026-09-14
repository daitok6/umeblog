"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { PostWithMeta } from "@/lib/repo/posts";
import { formatDate } from "@/lib/formatDate";

const GRAPHIC_TONES = ["cream", "aqua", "green"] as const;

/**
 * Masonry-flavoured grid, three card treatments per post (`kind`):
 * photo (cover + copy), graphic (flat colour block, no image), drawing
 * (dashed frame, hand-drawn cover). The newest post always gets the 2x3
 * "hero" span; up to two drawing-kind cards alternate a slight tilt for the
 * scrapbook feel — see design_handoff_blog_redesign/README.md.
 */
export default function PostList({ posts }: { posts: PostWithMeta[] }) {
  const cardRefs = useRef(new Map<number, HTMLLIElement>());

  // Re-runs whenever the (possibly filtered) post list changes, so cards
  // that appear after a search/tag filter still get observed — the design
  // reference only wires this up once on mount and misses that case.
  // Skipped entirely under prefers-reduced-motion rather than left to the
  // CSS override, so no observer work happens for a state no one will see.
  //
  // Gating re-observation on the DOM class (not a ref that outlives one
  // effect run) matters under React's dev-mode double-invoke: a throwaway
  // first mount's observer gets disconnected by its cleanup before its
  // (async) initial callback can fire, and only the second mount's observer
  // sticks around — a ref-based "already handled" guard would have wrongly
  // skipped that survivor because the first pass already marked it done.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

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

    posts.forEach((p, i) => {
      const el = cardRefs.current.get(p.id);
      if (!el || el.classList.contains("is-visible")) return;
      el.style.transitionDelay = `${(i % 12) * 0.06}s`;
      el.classList.add("pre-reveal");
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [posts]);

  if (posts.length === 0) {
    return (
      <div className="empty frame">
        <p className="empty__title">まだ、なにも書かれていません。</p>
        <p className="empty__sub">はじまりは、いつも静かに</p>
      </div>
    );
  }

  let drawingSeen = 0;

  return (
    <ul className="blog-grid">
      {posts.map((p, i) => {
        const isHero = i === 0;
        const tag = p.tags[0]?.name ?? null;
        const date = formatDate(p.publishedAt);

        let tilt = 0;
        if (p.kind === "drawing" && drawingSeen < 2) {
          tilt = drawingSeen === 0 ? -1.5 : 1.5;
          drawingSeen += 1;
        }

        const style: CSSProperties = {
          gridColumn: `span ${isHero ? 2 : 1}`,
          gridRow: `span ${isHero ? 3 : 2}`,
          transform: tilt ? `rotate(${tilt}deg)` : undefined,
        };

        const cardClass = (
          p.kind === "graphic"
            ? `blog-card blog-card--graphic blog-card--graphic-${GRAPHIC_TONES[i % GRAPHIC_TONES.length]}`
            : `blog-card blog-card--${p.kind}`
        ) + " reveal";

        return (
          <li
            key={p.id}
            ref={(el) => {
              if (el) cardRefs.current.set(p.id, el);
              else cardRefs.current.delete(p.id);
            }}
            className={cardClass}
            style={style}
          >
            <Link href={`/p/${p.slug}`} className="blog-card__link">
              {p.kind === "graphic" ? (
                <>
                  {tag ? <span className="blog-card__tag">({tag})</span> : null}
                  <h3 className="blog-card__title blog-card__title--big">{p.title || "無題"}</h3>
                  <span className="blog-card__date">{date}</span>
                </>
              ) : (
                <>
                  <span
                    className={p.cover ? "blog-card__cover" : "blog-card__cover blog-card__cover--empty"}
                  >
                    {p.cover ? (
                      <Image
                        src={p.cover.url}
                        alt={p.cover.alt}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        style={{ objectFit: "cover" }}
                      />
                    ) : null}
                  </span>
                  <span className="blog-card__body">
                    {tag ? <span className="blog-card__tag">({tag})</span> : null}
                    <span className="blog-card__title">{p.title || "無題"}</span>
                    {p.lead ? <span className="blog-card__lead">{p.lead}</span> : null}
                    <span className="blog-card__date">{date}</span>
                  </span>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
