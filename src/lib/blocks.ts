/**
 * Plain-text extraction from a stored BlockNote document — used for the
 * meta description / OG description / RSS summary when a post has no
 * explicit lead. Deliberately minimal; the real rendering lives in
 * BlockRenderer.tsx.
 */

type InlineContent = { type: string; text?: string; content?: InlineContent[] };
type Block = { type: string; content?: InlineContent[] | string; children?: Block[] };

function inlineText(nodes: InlineContent[] | string | undefined): string {
  if (!nodes) return "";
  if (typeof nodes === "string") return nodes;
  return nodes.map((n) => n.text ?? inlineText(n.content)).join("");
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
