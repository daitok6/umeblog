import Image from "next/image";
import Link from "next/link";
import ArticleToc from "@/components/ArticleToc";
import RelatedList from "@/components/RelatedList";
import TocSpy from "@/components/TocSpy";
import type { Heading } from "@/lib/blocks";
import { formatDate } from "@/lib/formatDate";
import type { PostWithMeta } from "@/lib/repo/posts";

/**
 * Desktop-only sticky sidebar for the article page: 目次 / 関連記事 /
 * 最近の記事. Hidden entirely below 768px (see `.article__aside` in
 * public.css) — the mobile equivalents (`<ArticleToc variant="mobile">`,
 * the `.related-tail` RelatedList) are separate elements rendered by the
 * page itself, not by this component.
 *
 * The sidebar scrolls independently of the page: `.article__sidebar` is
 * sticky *and* height-capped with its own `overflow-y`, so a long TOC or
 * card list gets its own scrollbar instead of stretching past the viewport.
 *
 * 最近の記事 renders thumbnail cards (cover + title + date), the same
 * stretched-link idiom as FeaturedRail/PostList — see the .side-card rules
 * in public.css. 関連記事 stays plain title+date links on purpose: that
 * markup is shared with the mobile `.related-tail` block via RelatedList.
 *
 * Server component: all three sections are static markup from server-fetched
 * props. The only client JS this pulls in is TocSpy, and only when there's
 * a TOC to spy on.
 */
export default function ArticleAside({
  headings,
  related,
  recent,
}: {
  headings: Heading[];
  related: PostWithMeta[];
  recent: PostWithMeta[];
}) {
  const hasToc = headings.length >= 2;
  const hasAnything = hasToc || related.length > 0 || recent.length > 0;
  if (!hasAnything) return null;

  return (
    <aside className="article__aside" role="complementary" aria-label="この記事の関連情報">
      <div className="article__sidebar">
        {hasToc ? (
          <>
            <ArticleToc headings={headings} variant="aside" />
            <TocSpy />
          </>
        ) : null}

        <RelatedList posts={related} headingId="side-related" />

        {recent.length > 0 ? (
          <nav className="side-block" aria-labelledby="side-recent" data-reveal>
            <h2 className="label" id="side-recent">
              最近の記事
            </h2>
            <ul className="side-cards">
              {recent.map((p) => (
                <li key={p.id} className="side-card">
                  <span
                    className={
                      p.cover ? "side-card__cover" : "side-card__cover side-card__cover--empty"
                    }
                  >
                    {p.cover ? (
                      <Image
                        src={p.cover.url}
                        alt={p.cover.alt}
                        fill
                        sizes="72px"
                        style={{ objectFit: "cover" }}
                      />
                    ) : null}
                  </span>
                  <span className="side-card__body">
                    <Link href={`/p/${p.slug}`} className="blog-card__link side-card__title">
                      {p.title || "無題"}
                    </Link>
                    <span className="side-card__date label">{formatDate(p.publishedAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </aside>
  );
}
