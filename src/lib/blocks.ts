/**
 * Plain-text extraction from a stored BlockNote document — used for the
 * meta description / OG description / RSS summary when a post has no
 * explicit lead. Deliberately minimal; the real rendering lives in
 * BlockRenderer.tsx.
 */

type InlineContent = { type: string; text?: string; content?: InlineContent[] };
type Block = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: InlineContent[] | string;
  children?: Block[];
};

function inlineText(nodes: InlineContent[] | string | undefined): string {
  if (!nodes) return "";
  if (typeof nodes === "string") return nodes;
  return nodes.map((n) => n.text ?? inlineText(n.content)).join("");
}

export type Heading = { id: string; level: 2 | 3 | 4; text: string };

/**
 * The single source of truth for heading anchors: BlockRenderer and
 * headingsFromBlocks both call this with the index into the same parsed
 * top-level block array, so the two can never drift. BlockNote persists a
 * stable block id, which keeps a shared #anchor working across edits; the
 * index is only the fallback for rows saved before ids existed.
 */
export function headingAnchorId(blockId: string | undefined, index: number): string {
  return `h-${blockId ?? index}`;
}

/**
 * Headings for the article's table of contents, in document order.
 *
 * Deliberately not slug-based: `slugify` (tags.ts) collapses Japanese text
 * to bare dashes, which would make every Japanese heading collide on the
 * same anchor. Block-id/index anchors sidestep that entirely.
 */
export function headingsFromBlocks(json: string): Heading[] {
  let blocks: Block[] = [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) blocks = parsed;
  } catch {
    return [];
  }

  const out: Heading[] = [];
  blocks.forEach((b, i) => {
    if (b.type !== "heading") return;
    const text = inlineText(b.content).trim();
    if (!text) return;
    // Matches BlockRenderer's own `?? 2` default, so an untagged level
    // always maps to the same rendered tag the TOC claims it links to.
    const level = Number(b.props?.level ?? 2);
    out.push({
      id: headingAnchorId(b.id, i),
      level: level === 1 ? 2 : level === 2 ? 3 : 4,
      text,
    });
  });
  return out;
}

export function excerptFromBlocks(json: string, maxLen = 140): string {
  let blocks: Block[] = [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) blocks = parsed;
  } catch {
    return "";
  }

  const text = blocks
    .map((b) => inlineText(b.content))
    .filter(Boolean)
    .join(" ")
    .trim();

  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}
