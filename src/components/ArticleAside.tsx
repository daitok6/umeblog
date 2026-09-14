import Link from "next/link";
import ArticleToc from "@/components/ArticleToc";
import RelatedList from "@/components/RelatedList";
import TocSpy from "@/components/TocSpy";
import type { Heading } from "@/lib/blocks";
import type { PostWithMeta } from "@/lib/repo/posts";
import { schema } from "@/lib/db";

type SideTag = schema.Tag & { count: number };

/**
 * Desktop-only sticky sidebar for the article page: 目次 / 関連記事 / 話題 /
 * 最近の記事. Hidden entirely below 768px (see `.article__aside` in
 * public.css) — the mobile equivalents (`<ArticleToc variant="mobile">`,
 * the `.related-tail` RelatedList) are separate elements rendered by the
 * page itself, not by this component.
 *
 * Server component: all four sections are static markup from server-fetched
 * props. The only client JS this pulls in is TocSpy, and only when there's
 * a TOC to spy on.
 */
export default function ArticleAside({
  headings,
  related,
  recent,
  tags,
}: {
  headings: Heading[];
  related: PostWithMeta[];
  recent: PostWithMeta[];
  tags: SideTag[];
}) {
  const hasToc = headings.length >= 2;
  const hasAnything = hasToc || related.length > 0 || tags.length > 0 || recent.length > 0;
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

        {tags.length > 0 ? (
          <nav className="side-block" aria-labelledby="side-tags" data-reveal>
            <h2 className="label" id="side-tags">
              話題
            </h2>
            <div className="side-tags">
              {tags.map((t) => (
                <Link key={t.id} className="side-tag" href={`/tag/${t.slug}`}>
                  {t.name}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}

        {recent.length > 0 ? (
          <nav className="side-block" aria-labelledby="side-recent" data-reveal>
            <h2 className="label" id="side-recent">
              最近の記事
            </h2>
            <ul className="side-list">
              {recent.map((p) => (
                <li key={p.id} className="side-item">
                  <Link href={`/p/${p.slug}`}>{p.title || "無題"}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </aside>
  );
}
