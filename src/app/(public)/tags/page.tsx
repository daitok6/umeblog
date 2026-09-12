import type { Metadata } from "next";
import Link from "next/link";
import { listWithCounts } from "@/lib/repo/tags";

export const revalidate = 300;
export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage() {
  const tags = await listWithCounts();

  return (
    <div className="container">
      <div className="section-title">
        <h2>Tags</h2>
        <span className="kana-sub">タグ</span>
      </div>
      <p className="prose" style={{ color: "var(--muted)", fontSize: "14px" }}>
        カテゴリは作らず、タグだけで始めています。数が増えたものを、あとからカテゴリに育てます。
      </p>
      <div className="tag-cloud">
        {tags.map((t) => (
          <Link key={t.id} href={`/tag/${t.slug}`}>
            {t.name}
            <span className="n">{t.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
