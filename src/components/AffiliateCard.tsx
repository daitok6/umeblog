/**
 * The affiliate product card — shared, dependency-free presentation used by
 * both the editor's custom block (src/components/admin/blocks/AffiliateLinkBlock.tsx)
 * and the public renderer (src/components/BlockRenderer.tsx).
 *
 * Deliberately kept out of the block file itself: that file imports
 * `@blocknote/react` to register the block, and BlockRenderer is designed to
 * ship zero editor JavaScript to public pages — importing the card from
 * there instead of from the block file keeps that true.
 */

export type AffiliateLinkProps = {
  url: string;
  title: string;
  price: string;
  image: string;
  network: "generic" | "amazon";
};

function NetworkBadge({ network }: { network: string }) {
  return (
    <span className={`affiliate-card__badge affiliate-card__badge--${network}`}>
      {network === "amazon" ? "Amazon" : "STORE"}
    </span>
  );
}

export function AffiliateCard({
  url,
  title,
  price,
  image,
  network,
  onEdit,
}: AffiliateLinkProps & { onEdit?: () => void }) {
  return (
    <div className="affiliate-card" contentEditable={false}>
      {image ? (
        // Product images come from arbitrary external hosts (Amazon, Rakuten,
        // any store) — not worth an allowlist in next/image config.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="affiliate-card__image" src={image} alt="" loading="lazy" />
      ) : (
        <div className="affiliate-card__image affiliate-card__image--empty" aria-hidden="true" />
      )}
      <div className="affiliate-card__body">
        <div className="affiliate-card__top">
          <NetworkBadge network={network} />
          <span className="affiliate-card__pr">PR</span>
        </div>
        <p className="affiliate-card__title">{title || url}</p>
        {price ? <p className="affiliate-card__price">{price}</p> : null}
        <a
          className="affiliate-card__cta"
          href={url}
          target="_blank"
          rel="nofollow sponsored noopener"
        >
          商品を見る
        </a>
      </div>
      {onEdit ? (
        <button type="button" className="affiliate-card__edit" onClick={onEdit}>
          編集
        </button>
      ) : null}
    </div>
  );
}
