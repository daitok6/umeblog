"use client";

import { isComposingEvent } from "@/lib/ime";
import { PILLAR_LABEL, PILLARS, PRIORITY_LABEL, PRIORITIES, TOPIC_TYPES, TYPE_LABEL } from "@/lib/tickets";
import {
  DELIVERABLE_STATUS_LABEL,
  DELIVERABLE_STATUSES,
  PLATFORM_LABEL,
  PLATFORMS,
  ROLE_LABEL,
  CONTENT_ROLES,
} from "@/lib/deliverables";

/**
 * A plain GET form — works without JavaScript, matches the existing
 * `/search` pattern. Every select carries "すべて" as the empty default so
 * an untouched filter never narrows anything by accident.
 */
export default function TicketFilters({
  view,
  scope,
  pillar,
  topicType,
  priority,
  tag,
  evergreen,
  seasonal,
  q,
  tagOptions,
  platform,
  deliverableStatus,
  role,
  plan,
  crossPlatform,
}: {
  view: string;
  scope: string;
  pillar: string;
  topicType: string;
  priority: string;
  tag: string;
  evergreen: boolean;
  seasonal: boolean;
  q: string;
  tagOptions: string[];
  platform: string;
  deliverableStatus: string;
  role: string;
  /** "" | "with" | "without" */
  plan: string;
  crossPlatform: string;
}) {
  return (
    <form method="get" className="ticket-filters" role="search">
      {view === "board" ? <input type="hidden" name="view" value="board" /> : null}
      {scope === "all" ? <input type="hidden" name="scope" value="all" /> : null}

      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="アイデアを検索"
        aria-label="アイデアを検索"
        maxLength={80}
        className="ticket-filters__q"
        onKeyDown={(e) => {
          if (isComposingEvent(e) && e.key === "Enter") e.preventDefault();
        }}
      />

      <label className="visually-hidden" htmlFor="tf-pillar">
        柱
      </label>
      <select id="tf-pillar" name="pillar" defaultValue={pillar}>
        <option value="">柱：すべて</option>
        {PILLARS.map((p) => (
          <option key={p} value={p}>
            {PILLAR_LABEL[p]}
          </option>
        ))}
      </select>

      <label className="visually-hidden" htmlFor="tf-type">
        種類
      </label>
      <select id="tf-type" name="topicType" defaultValue={topicType}>
        <option value="">種類：すべて</option>
        {TOPIC_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </select>

      <label className="visually-hidden" htmlFor="tf-priority">
        おすすめ度
      </label>
      <select id="tf-priority" name="priority" defaultValue={priority}>
        <option value="">おすすめ度：すべて</option>
        {PRIORITIES.filter((p) => PRIORITY_LABEL[p]).map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>

      {tagOptions.length > 0 ? (
        <>
          <label className="visually-hidden" htmlFor="tf-tag">
            タグ
          </label>
          <select id="tf-tag" name="tag" defaultValue={tag}>
            <option value="">タグ：すべて</option>
            {tagOptions.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        </>
      ) : null}

      <label className="ticket-filters__check">
        <input type="checkbox" name="evergreen" value="1" defaultChecked={evergreen} />
        定番
      </label>
      <label className="ticket-filters__check">
        <input type="checkbox" name="seasonal" value="1" defaultChecked={seasonal} />
        季節もの
      </label>

      <label className="visually-hidden" htmlFor="tf-platform">
        プラットフォーム
      </label>
      <select id="tf-platform" name="platform" defaultValue={platform}>
        <option value="">プラットフォーム：すべて</option>
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>
            {PLATFORM_LABEL[p]}
          </option>
        ))}
      </select>

      <label className="visually-hidden" htmlFor="tf-dstatus">
        プラットフォームの状態
      </label>
      <select id="tf-dstatus" name="dstatus" defaultValue={deliverableStatus}>
        <option value="">状態：すべて</option>
        {DELIVERABLE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {DELIVERABLE_STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <label className="visually-hidden" htmlFor="tf-role">
        役割
      </label>
      <select id="tf-role" name="role" defaultValue={role}>
        <option value="">役割：すべて</option>
        {CONTENT_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>

      <label className="visually-hidden" htmlFor="tf-plan">
        プラットフォーム計画
      </label>
      <select id="tf-plan" name="plan" defaultValue={plan}>
        <option value="">計画：すべて</option>
        <option value="with">プランあり</option>
        <option value="without">プランなし</option>
      </select>

      <label className="visually-hidden" htmlFor="tf-cross">
        展開しやすさ
      </label>
      <select id="tf-cross" name="cross" defaultValue={crossPlatform}>
        <option value="">展開しやすさ：すべて</option>
        <option value="high">大</option>
        <option value="medium">中</option>
        <option value="low">小</option>
      </select>

      <button type="submit" className="btn-sm">
        絞り込む
      </button>
      <a href={view === "board" ? "/admin/tickets?view=board" : "/admin/tickets"} className="label">
        すべて解除
      </a>
    </form>
  );
}
