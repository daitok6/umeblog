import Image from "next/image";
import { AffiliateCard } from "@/components/AffiliateCard";

/**
 * Renders a stored BlockNote document.
 *
 * Deliberately a small hand-rolled renderer rather than mounting the editor
 * read-only: the public pages then ship no editor JavaScript at all, which
 * matters because the editor bundle plus a Japanese webfont is already the
 * heaviest thing on the site.
 */

type InlineContent = {
  type: string;
  text?: string;
  styles?: Record<string, unknown>;
  href?: string;
  content?: InlineContent[];
};

type Block = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: InlineContent[] | string;
  children?: Block[];
};

function renderInline(nodes: InlineContent[] | string | undefined, keyPrefix = "i"): React.ReactNode {
  if (!nodes) return null;
  if (typeof nodes === "string") return nodes;

  return nodes.map((n, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (n.type === "link") {
      return (
        <a key={key} href={n.href} rel="noopener noreferrer" target="_blank">
          {renderInline(n.content, key)}
        </a>
      );
    }
    const text = n.text ?? "";
    const s = n.styles ?? {};
    let node: React.ReactNode = text;
    // Note: no italic branch. Japanese has no italics and browsers synthesise
    // an ugly oblique, so the editor's italic mark renders as weight instead.
    if (s.bold || s.italic) node = <strong key={key}>{node}</strong>;
    if (s.code) node = <code key={key}>{node}</code>;
    if (s.underline) node = <u key={key}>{node}</u>;
    return <span key={key}>{node}</span>;
  });
}

export default function BlockRenderer({ json }: { json: string }) {
  let blocks: Block[] = [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) blocks = parsed;
  } catch {
    blocks = [];
  }

  return (
    <>
      {blocks.map((b, i) => {
        const key = b.id ?? `b-${i}`;
        switch (b.type) {
          case "heading": {
            const level = Number(b.props?.level ?? 2);
            const Tag = (level === 1 ? "h2" : level === 2 ? "h3" : "h4") as "h2" | "h3" | "h4";
            return <Tag key={key}>{renderInline(b.content, key)}</Tag>;
          }
          case "bulletListItem":
            return (
              <ul key={key}>
                <li>{renderInline(b.content, key)}</li>
              </ul>
            );
          case "numberedListItem":
            return (
              <ol key={key}>
                <li>{renderInline(b.content, key)}</li>
              </ol>
            );
          case "quote":
            return <blockquote key={key}>{renderInline(b.content, key)}</blockquote>;
          case "image": {
            const url = String(b.props?.url ?? "");
            if (!url) return null;
            const alt = String(b.props?.caption ?? b.props?.name ?? "");
            return (
              <figure key={key} className="post-figure">
                <Image
                  src={url}
                  alt={alt}
                  width={Number(b.props?.previewWidth ?? 1200)}
                  height={800}
                  sizes="(max-width: 768px) 100vw, 720px"
                  quality={90}
                  style={{ width: "100%", height: "auto" }}
                />
                {alt ? <figcaption className="label">{alt}</figcaption> : null}
              </figure>
            );
          }
          case "affiliateLink": {
            const url = String(b.props?.url ?? "");
            if (!url) return null;
            return (
              <AffiliateCard
                key={key}
                url={url}
                title={String(b.props?.title ?? "")}
                price={String(b.props?.price ?? "")}
                image={String(b.props?.image ?? "")}
                network={b.props?.network === "amazon" ? "amazon" : "generic"}
              />
            );
          }
          case "divider":
            return <hr key={key} className="rule" />;
          case "paragraph":
          default: {
            const inner = renderInline(b.content, key);
            const isEmpty =
              !b.content || (Array.isArray(b.content) && b.content.length === 0);
            if (isEmpty) return null;
            return <p key={key}>{inner}</p>;
          }
        }
      })}
    </>
  );
}
