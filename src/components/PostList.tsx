import Link from "next/link";
import type { PostWithMeta } from "@/lib/repo/posts";

function formatDate(ms: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * A ruled list, not cards.
 *
 * The reference uses hairline rules throughout, and for a text-first blog it
 * reads better than cards: the eye runs down the titles instead of stopping
 * at every border.
 */
export default function PostList({ posts }: { posts: PostWithMeta[] }) {
  if (posts.length === 0) {
    return (
      <div className="empty frame">
        <span className="empty__serial serial">001</span>
        <p className="empty__title">まだ、なにも書かれていません。</p>
        <p className="empty__sub label">はじまりは、いつも静かに</p>
      </div>
    );
  }

  return (
    <ul className="post-list">
      {posts.map((p) => (
        <li key={p.id} className="post-row">
          <Link href={`/p/${p.slug}`} className="post-row__link">
            <span className="post-row__serial serial">
              {p.serial != null ? String(p.serial).padStart(3, "0") : "—"}
            </span>
            <span className="post-row__main">
              <span className="post-row__title">{p.title || "無題"}</span>
              {p.lead ? <span className="post-row__lead">{p.lead}</span> : null}
            </span>
            <span className="post-row__meta">
              <span className="post-row__date label">{formatDate(p.publishedAt)}</span>
              {p.tags.length > 0 ? (
                <span className="post-row__tags">
                  {p.tags.map((t) => (
                    <span key={t.id} className="post-row__tag">
                      {t.name}
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export { formatDate };
