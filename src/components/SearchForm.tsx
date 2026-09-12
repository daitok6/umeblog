"use client";

import { isComposingEvent } from "@/lib/ime";

/**
 * A plain GET form to `/search` — works with JavaScript disabled, so no
 * route handler or client-side fetch is needed.
 *
 * This is the site's one full-text search: it's the only place that reaches
 * into post bodies (see `searchPublished` in `src/lib/repo/posts.ts`). The
 * instant filter on `/blog` only ever matches titles/leads/tags, and links
 * back here for anything that needs the body text too.
 *
 * The Enter key during Japanese input confirms a 変換, not "submit" — see
 * `src/lib/ime.ts`. Without the guard below, confirming a conversion would
 * submit the form mid-composition and lose whatever came after.
 */
export default function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" method="get" className="site-search site-search--page" role="search">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="記事を検索"
        aria-label="記事を検索"
        maxLength={80}
        className="site-search__input"
        onKeyDown={(e) => {
          if (isComposingEvent(e) && e.key === "Enter") {
            e.preventDefault();
          }
        }}
      />
      <button type="submit" className="site-search__submit" aria-label="検索する">
        検索
      </button>
    </form>
  );
}
