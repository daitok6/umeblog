import type { Metadata } from "next";
import { headers } from "next/headers";
import PostList from "@/components/PostList";
import SearchForm from "@/components/SearchForm";
import { searchPublished } from "@/lib/repo/posts";
import { recordEvent } from "@/lib/repo/events";
import { hashVisitor } from "@/lib/analytics/identity";
import { isBot } from "@/lib/analytics/classify";

// `searchParams` is a request-time API, so this page is dynamic by nature —
// unlike the other public pages, it deliberately has no `revalidate`.

/**
 * Logs every real full-text search (never an empty page load) with its
 * result count. Zero-result rows are the single most actionable line in the
 * whole analytics pipeline — a literal list of what readers wanted that the
 * blog didn't have. Recorded directly from the server component rather than
 * via /api/track: this page already runs on every request (no revalidate),
 * already knows the result count, and has no client round-trip to make.
 */
async function recordSearch(query: string, resultCount: number): Promise<void> {
  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  if (isBot(userAgent)) return;

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  await recordEvent({
    type: "search",
    postId: null,
    path: "/search",
    visitorHash: hashVisitor(ip, userAgent),
    sessionId: "",
    source: "",
    referrerHost: "",
    campaign: "",
    medium: "",
    device: null,
    country: h.get("x-vercel-ip-country") ?? "",
    meta: JSON.stringify({ q: query.slice(0, 200), count: resultCount }),
  });
}

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
  if (query) await recordSearch(query, results.length);

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
