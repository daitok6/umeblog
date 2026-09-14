"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import PostList from "@/components/PostList";
import type { PostWithMeta } from "@/lib/repo/posts";
import { useReveal } from "@/lib/useReveal";

/** Just enough of a tag row to render a chip — keeps `db/schema` out of this client bundle. */
export type ChipTag = { name: string; slug: string };

/**
 * Instant client-side search + filters over the full published list.
 *
 * This intentionally only matches title/lead/tag names, never post bodies:
 * `contentJson` is raw BlockNote JSON, and shipping every post's body to the
 * browser just to make typing feel instant would turn a mostly-read page
 * into a multi-megabyte payload. Full body search stays one click away at
 * `/search`, which already does it server-side with `searchPublished`.
 *
 * `chips` is the author-curated, ordered allowlist from `/admin/tags`
 * (`listChips()`) — the chip row shows exactly these, in this order, never
 * every tag in use. `initialTag` pre-selects one on mount, for `/tag/[slug]`
 * reusing this same component instead of building a second filtered list.
 */
export default function BlogBrowser({
  posts,
  chips,
  initialTag = null,
}: {
  posts: PostWithMeta[];
  chips: ChipTag[];
  initialTag?: string | null;
}) {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(initialTag);
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

  // Counts still come from the live post list (so a chip's number is always
  // accurate), but which tags appear — and in what order — comes from the
  // curated `chips` list, not from "every tag in use, biggest first". An
  // active tag missing from `chips` (a reader followed a card link to an
  // uncurated tag) is kept as a one-off extra chip, otherwise the filter
  // would look active with nothing on screen explaining why.
  const tagFacets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      for (const t of p.tags) {
        counts.set(t.slug, (counts.get(t.slug) ?? 0) + 1);
      }
    }

    const facets = chips
      .map((t) => ({ name: t.name, slug: t.slug, count: counts.get(t.slug) ?? 0 }))
      .filter((t) => t.count > 0);

    if (tag && !facets.some((t) => t.slug === tag)) {
      const active = posts.find((p) => p.tags.some((t) => t.slug === tag))?.tags.find(
        (t) => t.slug === tag,
      );
      if (active) facets.unshift({ name: active.name, slug: active.slug, count: counts.get(tag) ?? 0 });
    }

    return facets;
  }, [posts, chips, tag]);

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

  // "人気" is a highlight reel of the current results, not a separate pool —
  // it can (and usually does) overlap with "最新" below. Only worth showing
  // once there's enough in "最新" that a 5-post highlight actually curates
  // something, rather than just repeating the whole grid a second time.
  const popularPosts = useMemo(() => {
    if (filtered.length <= 5) return [];
    return [...filtered].sort((a, b) => b.views - a.views).slice(0, 5);
  }, [filtered]);
  const hasPopular = popularPosts.length > 0;

  const hasFilters = query.trim() !== "" || tag != null;

  function resetFilters() {
    setRawQuery("");
    setQuery("");
    setTag(null);
  }

  const revealRef = useReveal<HTMLDivElement>([filtered]);

  return (
    <div className="blog-browser" ref={revealRef}>
      <div className="blog-filters" data-reveal>
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

          <Link
            href={query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search"}
            className="blog-filters__searchall"
          >
            本文も検索する →
          </Link>

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

      <p className="blog-count" data-reveal aria-live="polite">
        {filtered.length} 本
      </p>

      {hasPopular ? (
        <>
          <h2 className="blog-section-heading" data-reveal>
            人気<span className="blog-section-heading__label">popular</span>
          </h2>
          <PostList posts={popularPosts} />
        </>
      ) : null}

      {posts.length > 0 ? (
        <h2 className="blog-section-heading" data-reveal>
          最新<span className="blog-section-heading__label">latest</span>
        </h2>
      ) : null}

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
