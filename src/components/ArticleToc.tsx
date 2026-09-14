import type { Heading } from "@/lib/blocks";

function TocList({ headings }: { headings: Heading[] }) {
  return (
    <ol className="toc">
      {headings.map((h) => (
        <li key={h.id} className={`toc__item toc__item--${h.level}`}>
          <a className="toc__link" href={`#${h.id}`}>
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Table of contents, in one of two shapes sharing the same markup/CSS
 * building block (`.toc`): `variant="aside"` is the desktop sidebar's `<nav>`
 * (paired with TocSpy for scroll highlighting), `variant="mobile"` is a
 * collapsed `<details>` shown only under the 768px breakpoint. Both are
 * always rendered when there's a TOC to show — visibility is CSS-only, so
 * the mobile copy still works if JS never runs.
 *
 * Renders nothing for 0 or 1 headings: a single-entry TOC has nothing to
 * navigate.
 */
export default function ArticleToc({
  headings,
  variant,
}: {
  headings: Heading[];
  variant: "aside" | "mobile";
}) {
  if (headings.length < 2) return null;

  if (variant === "mobile") {
    return (
      <details className="article__toc-m">
        <summary className="label">目次</summary>
        <TocList headings={headings} />
      </details>
    );
  }

  return (
    <nav className="side-block" aria-labelledby="side-toc" data-reveal>
      <h2 className="label" id="side-toc">
        目次
      </h2>
      <TocList headings={headings} />
    </nav>
  );
}
