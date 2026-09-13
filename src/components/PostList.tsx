import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { PostWithMeta } from "@/lib/repo/posts";

function formatDate(ms: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const GRAPHIC_TONES = ["cream", "aqua", "green"] as const;

/**
 * Masonry-flavoured grid, three card treatments per post (`kind`):
 * photo (cover + copy), graphic (flat colour block, no image), drawing
 * (dashed frame, hand-drawn cover). The newest post always gets the 2x3
 * "hero" span; up to two drawing-kind cards alternate a slight tilt for the
 * scrapbook feel — see design_handoff_blog_redesign/README.md.
 */
export default function PostList({ posts }: { posts: PostWithMeta[] }) {
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

        const cardClass =
          p.kind === "graphic"
            ? `blog-card blog-card--graphic blog-card--graphic-${GRAPHIC_TONES[i % GRAPHIC_TONES.length]}`
            : `blog-card blog-card--${p.kind}`;

        return (
          <li key={p.id} className={cardClass} style={style}>
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

export { formatDate };
