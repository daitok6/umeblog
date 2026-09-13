"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import PostList from "@/components/PostList";
import type { PostWithMeta } from "@/lib/repo/posts";

/**
 * Instant client-side search + filters over the full published list.
 *
 * This intentionally only matches title/lead/tag names, never post bodies:
 * `contentJson` is raw BlockNote JSON, and shipping every post's body to the
 * browser just to make typing feel instant would turn a mostly-read page
 * into a multi-megabyte payload. Full body search stays one click away at
 * `/search`, which already does it server-side with `searchPublished`.
 */
export default function BlogBrowser({ posts }: { posts: PostWithMeta[] }) {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const composing = useRef(false);
  const debounceId = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the committed query ~120ms behind typing, but never while an
  // IME composition is in flight — see src/lib/ime.ts. Committing mid-変換
  // would filter on a half-typed reading and flash results under the input.
  useEffect(() => {
    if (composing.current) return;
    debounceId.current = setTimeout(() => setQuery(rawQuery), 120);
    return () => {
      if (debounceId.current) clearTimeout(debounceId.current);
    };
  }, [rawQuery]);

  const tagFacets = useMemo(() => {
    const counts = new Map<string, { name: string; slug: string; count: number }>();
    for (const p of posts) {
      for (const t of p.tags) {
        const entry = counts.get(t.slug) ?? { name: t.name, slug: t.slug, count: 0 };
        entry.count += 1;
        counts.set(t.slug, entry);
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = posts;

    if (q) {
      rows = rows.filter((p) => {
        const haystack = [p.title, p.lead, ...p.tags.map((t) => t.name)]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (tag) {
      rows = rows.filter((p) => p.tags.some((t) => t.slug === tag));
    }

    return [...rows].sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  }, [posts, query, tag]);

  const hasFilters = query.trim() !== "" || tag != null;

  function resetFilters() {
    setRawQuery("");
    setQuery("");
    setTag(null);
  }

  return (
    <div className="blog-browser">
      <div className="blog-filters">
        <div className="blog-filters__row">
          <label className="visually-hidden" htmlFor="blog-search">
            記事を検索
          </label>
          <input
            id="blog-search"
            type="search"
            className="blog-filters__search"
            placeholder="タイトル・タグで検索"
            value={rawQuery}
            maxLength={80}
            onChange={(e) => setRawQuery(e.target.value)}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(e) => {
              composing.current = false;
              setQuery(e.currentTarget.value);
            }}
          />

          {hasFilters ? (
            <button type="button" className="blog-filters__reset" onClick={resetFilters}>
              すべて解除
            </button>
          ) : null}
        </div>

        {tagFacets.length > 0 ? (
          <div className="blog-filters__row blog-filters__row--chips">
            {tagFacets.map((t) => (
              <button
                key={t.slug}
                type="button"
                className="blog-filters__chip"
                aria-pressed={tag === t.slug}
                onClick={() => setTag(tag === t.slug ? null : t.slug)}
              >
                ({t.name})<span className="n">{t.count}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="blog-count" aria-live="polite">
        {filtered.length} 本
      </p>

      {filtered.length === 0 && posts.length > 0 ? (
        <div className="blog-nomatch frame">
          <p>条件に一致する記事はありませんでした。</p>
          <p className="blog-nomatch__sub">小生、探すのをやめない。</p>
          {query.trim() ? (
            <p>
              <Link href={`/search?q=${encodeURIComponent(query.trim())}`}>
                本文もふくめて「{query.trim()}」を検索する →
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <PostList posts={filtered} />
      )}
    </div>
  );
}
