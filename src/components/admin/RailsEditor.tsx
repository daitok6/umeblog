"use client";

import { useState } from "react";
import {
  RAIL_KIND_LABELS,
  serializeRails,
  type RailConfig,
  type RailKind,
} from "@/lib/rails";

const RAIL_KINDS: RailKind[] = ["recent", "viewed", "discussed", "tag"];

/**
 * Reorders/adds/removes home-page rails, writing the result into one hidden
 * input (`railsJson`) so it submits as part of the existing settings form —
 * the server action re-validates it with `parseRails` before saving, so
 * nothing here needs to be trusted.
 */
export default function RailsEditor({
  defaultRails,
  tags,
}: {
  defaultRails: RailConfig[];
  tags: { name: string; slug: string }[];
}) {
  const [rails, setRails] = useState<RailConfig[]>(defaultRails);

  function update(i: number, patch: Partial<RailConfig>) {
    setRails((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function move(i: number, dir: -1 | 1) {
    setRails((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function remove(i: number) {
    setRails((rs) => rs.filter((_, idx) => idx !== i));
  }
  function add() {
    setRails((rs) => [...rs, { kind: "recent" }]);
  }

  return (
    <div className="rails-editor">
      <input type="hidden" name="railsJson" value={serializeRails(rails)} />

      {rails.length === 0 ? (
        <p className="label">棚がありません。既定の並び（最近の記事・よく話された）が使われます。</p>
      ) : null}

      {rails.map((rail, i) => (
        <div key={i} className="rails-editor__row">
          <label className="visually-hidden" htmlFor={`rail-kind-${i}`}>
            棚の種類
          </label>
          <select
            id={`rail-kind-${i}`}
            value={rail.kind}
            onChange={(e) => update(i, { kind: e.target.value as RailKind })}
          >
            {RAIL_KINDS.map((k) => (
              <option key={k} value={k}>
                {RAIL_KIND_LABELS[k]}
              </option>
            ))}
          </select>

          {rail.kind === "tag" ? (
            <>
              <label className="visually-hidden" htmlFor={`rail-tag-${i}`}>
                タグ
              </label>
              <select
                id={`rail-tag-${i}`}
                value={rail.tag ?? ""}
                onChange={(e) => update(i, { tag: e.target.value })}
              >
                <option value="">タグを選択</option>
                {tags.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <label className="visually-hidden" htmlFor={`rail-label-${i}`}>
            見出し（任意）
          </label>
          <input
            id={`rail-label-${i}`}
            type="text"
            placeholder="見出し（省略時は既定）"
            value={rail.label ?? ""}
            maxLength={40}
            onChange={(e) => update(i, { label: e.target.value || undefined })}
          />

          <div className="rails-editor__actions">
            <button
              type="button"
              aria-label="上へ移動"
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="下へ移動"
              disabled={i === rails.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
            <button type="button" aria-label="この棚を削除" onClick={() => remove(i)}>
              削除
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn--ghost" onClick={add}>
        棚を追加
      </button>
    </div>
  );
}
