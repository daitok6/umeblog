"use client";

import { isComposingEvent } from "@/lib/ime";

/**
 * A plain GET form to `/search` — works with JavaScript disabled, so no
 * route handler or client-side fetch is needed.
 *
 * The Enter key during Japanese input confirms a 変換, not "submit" — see
 * `src/lib/ime.ts`. Without the guard below, confirming a conversion would
 * submit the form mid-composition and lose whatever came after.
 */
export default function SearchForm({
  defaultValue = "",
  variant = "header",
}: {
  defaultValue?: string;
  variant?: "header" | "page";
}) {
  return (
    <form
      action="/search"
      method="get"
      className={variant === "header" ? "site-search site-search--header" : "site-search site-search--page"}
      role="search"
    >
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
