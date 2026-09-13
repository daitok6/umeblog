"use client";

import { useActionState } from "react";
import { saveTicketAction, type TicketFormState } from "@/app/actions/tickets";
import SuggestedQuestions from "@/components/admin/SuggestedQuestions";
import { isComposingEvent } from "@/lib/ime";
import {
  PILLAR_LABEL,
  PILLARS,
  PRIORITY_LABEL,
  PRIORITIES,
  SIGNAL_LABEL,
  SIGNAL_LEVELS,
  TOPIC_TYPES,
  TYPE_LABEL,
  parseQuestions,
} from "@/lib/tickets";
import type { TicketWithMeta } from "@/lib/repo/tickets";

const initial: TicketFormState = { ok: false, error: "" };

function toDateInput(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** One form, used for both create and edit — keyed on a hidden `id`. */
export default function TicketForm({ ticket }: { ticket?: TicketWithMeta }) {
  const [state, action, pending] = useActionState(saveTicketAction, initial);

  return (
    <form action={action} className="ticket-form">
      {ticket ? <input type="hidden" name="id" value={ticket.id} /> : null}

      <label htmlFor="tk-title">タイトル</label>
      <input
        id="tk-title"
        name="title"
        defaultValue={ticket?.title ?? ""}
        maxLength={120}
        placeholder="例：マレーシアの朝ごはん事情"
        required
      />

      <label htmlFor="tk-description">ひとこと説明</label>
      <textarea
        id="tk-description"
        name="description"
        defaultValue={ticket?.description ?? ""}
        maxLength={400}
        rows={2}
        placeholder="どんな話になりそうか、一言で"
      />

      <div className="ticket-form__row">
        <div>
          <label htmlFor="tk-pillar">柱</label>
          <select id="tk-pillar" name="pillar" defaultValue={ticket?.pillar ?? "live"}>
            {PILLARS.map((p) => (
              <option key={p} value={p}>
                {PILLAR_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tk-type">種類</label>
          <select id="tk-type" name="topicType" defaultValue={ticket?.topicType ?? "journal"}>
            {TOPIC_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tk-priority">おすすめ度</label>
          <select id="tk-priority" name="priority" defaultValue={ticket?.priority ?? "normal"}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p] ?? "ふつう"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details className="ticket-form__section">
        <summary>どうして面白そうか</summary>
        <label htmlFor="tk-inspiration">きっかけ・背景</label>
        <textarea
          id="tk-inspiration"
          name="inspirationNotes"
          defaultValue={ticket?.inspirationNotes ?? ""}
          maxLength={2000}
          rows={4}
          placeholder="なぜこの話が面白そうか、自由に"
        />

        <span className="label">聞いてみたいこと</span>
        <SuggestedQuestions initial={ticket ? parseQuestions(ticket.suggestedQuestions) : []} />
      </details>

      <details className="ticket-form__section">
        <summary>絵にするなら・タグ</summary>
        <label htmlFor="tk-creative">クリエイティブのアイデア</label>
        <textarea
          id="tk-creative"
          name="creativeIdeas"
          defaultValue={ticket?.creativeIdeas ?? ""}
          maxLength={1000}
          rows={3}
          placeholder="イラスト案、写真シリーズ、ビフォーアフター、地図など"
        />

        <label htmlFor="tk-tags">タグ</label>
        <input
          id="tk-tags"
          name="tags"
          defaultValue={ticket?.tags.map((t) => t.name).join(" ") ?? ""}
          placeholder="スペース区切りで（例：日々 ごはん）"
          onKeyDown={(e) => {
            if (isComposingEvent(e) && e.key === "Enter") e.preventDefault();
          }}
        />
      </details>

      <details className="ticket-form__section">
        <summary>手ごたえと時期</summary>
        <div className="ticket-form__row">
          <div>
            <label htmlFor="tk-seo">SEOの見込み</label>
            <select id="tk-seo" name="seoPotential" defaultValue={ticket?.seoPotential ?? "none"}>
              {SIGNAL_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {SIGNAL_LABEL[s] ?? "未設定"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tk-monetization">収益化の見込み</label>
            <select
              id="tk-monetization"
              name="monetizationPotential"
              defaultValue={ticket?.monetizationPotential ?? "none"}
            >
              {SIGNAL_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {SIGNAL_LABEL[s] ?? "未設定"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tk-social">SNSの見込み</label>
            <select id="tk-social" name="socialPotential" defaultValue={ticket?.socialPotential ?? "none"}>
              {SIGNAL_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {SIGNAL_LABEL[s] ?? "未設定"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tk-cross">展開しやすさ</label>
            <select
              id="tk-cross"
              name="crossPlatformPotential"
              defaultValue={ticket?.crossPlatformPotential ?? "none"}
            >
              {SIGNAL_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {SIGNAL_LABEL[s] ?? "未設定"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="ticket-form__check">
          <input type="checkbox" name="evergreen" defaultChecked={ticket?.evergreen ?? false} />
          いつでも読める定番ネタ
        </label>
        <label className="ticket-form__check">
          <input type="checkbox" name="seasonal" defaultChecked={ticket?.seasonal ?? false} />
          季節ものネタ
        </label>

        <label htmlFor="tk-target">公開したい時期（任意）</label>
        <input
          id="tk-target"
          type="date"
          name="targetPublishDate"
          defaultValue={toDateInput(ticket?.targetPublishDate ?? null)}
        />
      </details>

      {state.error ? (
        <p className="form-error" data-testid="ticket-form-error">
          {state.error}
        </p>
      ) : null}

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "保存中…" : ticket ? "保存する" : "アイデアを追加"}
      </button>
    </form>
  );
}
