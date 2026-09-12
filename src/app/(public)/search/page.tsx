import type { Metadata } from "next";
import PostList from "@/components/PostList";
import SearchForm from "@/components/SearchForm";
import { searchPublished } from "@/lib/repo/posts";

// `searchParams` is a request-time API, so this page is dynamic by nature —
// unlike the other public pages, it deliberately has no `revalidate`.

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `検索: ${q}` : "検索" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchPublished(query) : [];

  return (
    <div className="container">
      <div className="section-title">
        <h2>Search</h2>
        <span className="kana-sub">検索</span>
      </div>

      <SearchForm defaultValue={query} />

      {query ? (
        <>
          <p className="label" style={{ margin: "16px 0" }}>
            {results.length > 0
              ? `「${query}」に一致する記事: ${results.length} 件`
              : `「${query}」に一致する記事はありませんでした。`}
          </p>
          <PostList posts={results} />
        </>
      ) : (
        <p className="label" style={{ margin: "16px 0" }}>
          キーワードを入力して記事を検索してください。
        </p>
      )}
    </div>
  );
}
