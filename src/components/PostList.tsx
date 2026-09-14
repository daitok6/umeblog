"use client";

import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { PostWithMeta } from "@/lib/repo/posts";
import { formatDate } from "@/lib/formatDate";
import { useReveal } from "@/lib/useReveal";

const GRAPHIC_TONES = ["cream", "aqua", "green"] as const;

/**
 * Masonry-flavoured grid, three card treatments per post (`kind`):
 * photo (cover + copy), graphic (flat colour block, no image), drawing
 * (dashed frame, hand-drawn cover). The newest post always gets the 2x3
 * "hero" span; up to two drawing-kind cards alternate a slight tilt for the
 * scrapbook feel — see design_handoff_blog_redesign/README.md.
 */
export default function PostList({ posts }: { posts: PostWithMeta[] }) {
  // Re-runs whenever the (possibly filtered) post list changes, so cards
  // that appear after a search/tag filter still get observed — the design
  // reference only wires this up once on mount and misses that case. See
  // src/lib/useReveal.ts for the reduced-motion and dev-double-invoke
  // details this depends on.
  const listRef = useReveal<HTMLUListElement>([posts]);

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
    <ul className="blog-grid" ref={listRef}>
      {posts.map((p, i) => {
        const isHero = i === 0;
        // A grid row is only 190px tall — a post with its full 8-tag
        // allowance (setPostTags' cap) would overrun it, so the card shows
        // at most 3 and the rest stay one click away on the post page.
        const cardTags = p.tags.slice(0, 3);
        const date = formatDate(p.publishedAt);

        let tilt = 0;
        if (p.kind === "drawing" && drawingSeen < 2) {
          tilt = drawingSeen === 0 ? -1.5 : 1.5;
          drawingSeen += 1;
        }

        // Tilt travels as a custom property, not `transform` directly:
        // the reveal states in public.css compose their own `transform`
        // (translateY/scale) and need to fold rotate(var(--tilt)) in
        // alongside it. An inline `transform` here would win over the
        // stylesheet outright and silently cancel the reveal's motion.
        const style: CSSProperties = {
          gridColumn: `span ${isHero ? 2 : 1}`,
          gridRow: `span ${isHero ? 3 : 2}`,
          ...(tilt ? ({ "--tilt": `${tilt}deg` } as CSSProperties) : null),
        };

        const cardClass =
          p.kind === "graphic"
            ? `blog-card blog-card--graphic blog-card--graphic-${GRAPHIC_TONES[i % GRAPHIC_TONES.length]}`
            : `blog-card blog-card--${p.kind}`;

        // The card's whole body used to be one <Link>, with the tag inside
        // it — an <a> can't nest inside another <a>, so making tags
        // clickable meant restructuring: the title alone is the real link,
        // stretched over the full card with `.blog-card__title::after`
        // (see public.css), and the tags sit beside it as their own links,
        // lifted onto `z-index: 1` so they stay reachable above the overlay.
        const tagLinks = cardTags.length > 0 ? (
          <span className="blog-card__tags">
            {cardTags.map((t) => (
              <Link key={t.slug} href={`/tag/${t.slug}`} className="blog-card__tag">
                ({t.name})
              </Link>
            ))}
          </span>
        ) : null;

        return (
          <li key={p.id} data-reveal className={cardClass} style={style}>
            {p.kind === "graphic" ? (
              <>
                {tagLinks}
                <h3 className="blog-card__title blog-card__title--big">
                  <Link href={`/p/${p.slug}`} className="blog-card__link">
                    {p.title || "無題"}
                  </Link>
                </h3>
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
                  {tagLinks}
                  <Link href={`/p/${p.slug}`} className="blog-card__link blog-card__title">
                    {p.title || "無題"}
                  </Link>
                  {p.lead ? <span className="blog-card__lead">{p.lead}</span> : null}
                  <span className="blog-card__date">{date}</span>
                </span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
