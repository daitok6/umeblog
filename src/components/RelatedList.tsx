import Link from "next/link";
import { formatDate } from "@/lib/formatDate";
import type { PostWithMeta } from "@/lib/repo/posts";

/**
 * "関連記事" — shared between the desktop sidebar and the mobile
 * end-of-article block (`.related-tail`). Both copies can be in the DOM at
 * once (CSS toggles which one is visible per breakpoint), so `headingId`
 * must be passed distinctly by each caller to keep `aria-labelledby` ids
 * unique.
 */
export default function RelatedList({
  posts,
  headingId,
  className,
}: {
  posts: PostWithMeta[];
  headingId: string;
  className?: string;
}) {
  if (posts.length === 0) return null;

  return (
    <nav
      className={["side-block", className].filter(Boolean).join(" ")}
      aria-labelledby={headingId}
      data-reveal
    >
      <h2 className="label" id={headingId}>
        関連記事
      </h2>
      <ul className="side-list">
        {posts.map((p) => (
          <li key={p.id} className="side-item">
            <Link href={`/p/${p.slug}`}>{p.title || "無題"}</Link>
            <span className="side-item__date label">{formatDate(p.publishedAt)}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
