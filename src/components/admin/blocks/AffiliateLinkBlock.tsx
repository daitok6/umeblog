"use client";

import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { AffiliateCard, type AffiliateLinkProps } from "@/components/AffiliateCard";

/**
 * A manually-filled product card — no OGP scraping, no API keys. The author
 * pastes the affiliate URL and types in the title/price/image themselves,
 * which works for any store and never depends on a third party's page being
 * fetchable server-side (Amazon/Rakuten routinely block that anyway).
 *
 * Always renders a "PR" label — Japan's stealth-marketing (ステマ) rules
 * require a clear ad disclosure on affiliate content, so this isn't
 * optional per-post. The rendered card itself (AffiliateCard) is shared with
 * the public BlockRenderer — only the editable form here is admin-only.
 */
export const affiliateLinkConfig = {
  type: "affiliateLink",
  propSchema: {
    url: { default: "" },
    title: { default: "" },
    price: { default: "" },
    image: { default: "" },
    network: { default: "generic", values: ["generic", "amazon"] },
  },
  content: "none",
} as const;

export const AffiliateLinkBlock = createReactBlockSpec(affiliateLinkConfig, {
  render: (props) => {
    const { block, editor } = props;
    const [editing, setEditing] = useState(!block.props.url);
    const [form, setForm] = useState<AffiliateLinkProps>({ ...block.props });

    if (!editing) {
      return (
        <AffiliateCard
          {...block.props}
          onEdit={() => {
            setForm({ ...block.props });
            setEditing(true);
          }}
        />
      );
    }

    return (
      <div className="affiliate-form" contentEditable={false}>
        <p className="affiliate-form__label label">アフィリエイトリンク</p>
        <div className="affiliate-form__row">
          <button
            type="button"
            className={`affiliate-form__network${form.network === "generic" ? " is-active" : ""}`}
            onClick={() => setForm((f) => ({ ...f, network: "generic" }))}
          >
            一般
          </button>
          <button
            type="button"
            className={`affiliate-form__network${form.network === "amazon" ? " is-active" : ""}`}
            onClick={() => setForm((f) => ({ ...f, network: "amazon" }))}
          >
            Amazon
          </button>
        </div>
        <input
          className="affiliate-form__input"
          placeholder="URL（https://…）"
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
        />
        <input
          className="affiliate-form__input"
          placeholder="商品名"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <input
          className="affiliate-form__input"
          placeholder="価格（例：¥3,980）"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
        />
        <input
          className="affiliate-form__input"
          placeholder="画像URL（任意）"
          value={form.image}
          onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
        />
        <div className="affiliate-form__actions">
          <button
            type="button"
            className="btn-sm"
            disabled={!form.url.trim()}
            onClick={() => {
              editor.updateBlock(block, { props: { ...form, url: form.url.trim() } });
              setEditing(false);
            }}
          >
            追加する
          </button>
        </div>
      </div>
    );
  },
})();
