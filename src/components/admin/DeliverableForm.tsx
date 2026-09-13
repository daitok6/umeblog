"use client";

import { useActionState, useState, type KeyboardEvent } from "react";
import { saveDeliverableAction, type DeliverableFormState } from "@/app/actions/deliverables";
import { isComposingEvent } from "@/lib/ime";
import {
  DEFAULT_ROLE,
  DELIVERABLE_STATUS_LABEL,
  DELIVERABLE_STATUSES,
  FORMAT_SUGGESTIONS,
  PLATFORM_LABEL,
  PLATFORMS,
  ROLE_LABEL_LONG,
  CONTENT_ROLES,
  parseMetadata,
  toPlatform,
  type Platform,
} from "@/lib/deliverables";
import type { TicketDeliverable } from "@/lib/db/schema";

const initial: DeliverableFormState = { ok: false, error: "" };

function toDateInput(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Sibling = { id: number; platform: Platform; format: string; workingTitle: string };

/**
 * One form for both create and edit — keyed on a hidden `id`, same idiom as
 * TicketForm. Only `platform` is required; everything else may be left
 * blank. Fields specific to the chosen platform (format suggestions,
 * metadata) swap when the platform select changes.
 */
export default function DeliverableForm({
  ticketId,
  deliverable,
  siblings,
  onSaved,
}: {
  ticketId: number;
  deliverable?: TicketDeliverable;
  siblings: Sibling[];
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState(async (prev: DeliverableFormState, fd: FormData) => {
    const result = await saveDeliverableAction(prev, fd);
    if (result.ok) onSaved?.();
    return result;
  }, initial);

  const [platform, setPlatform] = useState<Platform>(deliverable?.platform ?? "blog");
  const meta = parseMetadata(platform, deliverable?.metadataJson ?? "{}");
  const idPrefix = deliverable ? `dl-${deliverable.id}` : `dl-new-${ticketId}`;
  const guardEnter = (e: KeyboardEvent) => {
    if (isComposingEvent(e) && e.key === "Enter") e.preventDefault();
  };

  return (
    <form action={action} className="ticket-form deliverable-form">
      <input type="hidden" name="ticketId" value={ticketId} />
      {deliverable ? <input type="hidden" name="id" value={deliverable.id} /> : null}

      <div className="ticket-form__row">
        <div>
          <label htmlFor={`${idPrefix}-platform`}>プラットフォーム</label>
          <select
            id={`${idPrefix}-platform`}
            name="platform"
            defaultValue={platform}
            onChange={(e) => setPlatform(toPlatform(e.target.value))}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-format`}>形式</label>
          <input
            id={`${idPrefix}-format`}
            name="format"
            list={`${idPrefix}-format-options`}
            defaultValue={deliverable?.format ?? ""}
            maxLength={60}
            placeholder="例：カルーセル"
            onKeyDown={guardEnter}
          />
          <datalist id={`${idPrefix}-format-options`}>
            {FORMAT_SUGGESTIONS[platform].map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-role`}>役割</label>
          <select id={`${idPrefix}-role`} name="role" defaultValue={deliverable?.role ?? DEFAULT_ROLE[platform]}>
            <option value="none">{ROLE_LABEL_LONG.none}</option>
            {CONTENT_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL_LONG[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label htmlFor={`${idPrefix}-title`}>仮タイトル</label>
      <input
        id={`${idPrefix}-title`}
        name="workingTitle"
        defaultValue={deliverable?.workingTitle ?? ""}
        maxLength={120}
        placeholder="この版だけのタイトル案（任意）"
        onKeyDown={guardEnter}
      />

      <label htmlFor={`${idPrefix}-angle`}>切り口</label>
      <textarea
        id={`${idPrefix}-angle`}
        name="angle"
        defaultValue={deliverable?.angle ?? ""}
        maxLength={300}
        rows={2}
        placeholder="この版ならではの見せ方"
      />

      <div className="ticket-form__row">
        <div>
          <label htmlFor={`${idPrefix}-status`}>状態</label>
          <select id={`${idPrefix}-status`} name="status" defaultValue={deliverable?.status ?? "idea"}>
            {DELIVERABLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DELIVERABLE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-target`}>公開したい時期（任意）</label>
          <input
            id={`${idPrefix}-target`}
            type="date"
            name="targetPublishDate"
            defaultValue={toDateInput(deliverable?.targetPublishDate ?? null)}
          />
        </div>
      </div>

      <details className="ticket-form__section">
        <summary>こまかい設定</summary>

        <label htmlFor={`${idPrefix}-notes`}>メモ</label>
        <textarea
          id={`${idPrefix}-notes`}
          name="notes"
          defaultValue={deliverable?.notes ?? ""}
          maxLength={1000}
          rows={3}
          placeholder="この版だけのメモ"
        />

        {platform !== "blog" ? (
          <>
            <label htmlFor={`${idPrefix}-url`}>公開後のURL（任意）</label>
            <input
              id={`${idPrefix}-url`}
              name="publishedUrl"
              defaultValue={deliverable?.publishedUrl ?? ""}
              placeholder="https://..."
              onKeyDown={guardEnter}
            />
          </>
        ) : null}

        {siblings.length > 0 ? (
          <>
            <label htmlFor={`${idPrefix}-source`}>もとにした版（任意）</label>
            <select
              id={`${idPrefix}-source`}
              name="sourceDeliverableId"
              defaultValue={deliverable?.sourceDeliverableId ?? ""}
            >
              <option value="">なし</option>
              {siblings.map((s) => (
                <option key={s.id} value={s.id}>
                  {PLATFORM_LABEL[s.platform]}
                  {s.format ? ` ${s.format}` : ""}
                  {s.workingTitle ? `「${s.workingTitle}」` : ""}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {platform === "instagram" ? (
          <>
            <label htmlFor={`${idPrefix}-caption`}>キャプション案</label>
            <textarea
              id={`${idPrefix}-caption`}
              name="meta_caption"
              defaultValue={meta.caption ?? ""}
              rows={3}
              maxLength={2200}
            />
            <div className="ticket-form__row">
              <div>
                <label htmlFor={`${idPrefix}-slides`}>枚数</label>
                <input
                  id={`${idPrefix}-slides`}
                  name="meta_slideCount"
                  type="number"
                  min={0}
                  max={20}
                  defaultValue={meta.slideCount ?? ""}
                />
              </div>
              <div>
                <label htmlFor={`${idPrefix}-cta`}>行動喚起</label>
                <input
                  id={`${idPrefix}-cta`}
                  name="meta_callToAction"
                  defaultValue={meta.callToAction ?? ""}
                  maxLength={120}
                  onKeyDown={guardEnter}
                />
              </div>
            </div>
            <label htmlFor={`${idPrefix}-hashtags`}>ハッシュタグ</label>
            <input
              id={`${idPrefix}-hashtags`}
              name="meta_hashtags"
              defaultValue={(meta.hashtags ?? []).join(" ")}
              placeholder="スペース区切り"
              onKeyDown={guardEnter}
            />
          </>
        ) : null}

        {platform === "note" ? (
          <>
            <label className="ticket-form__check">
              <input type="checkbox" name="meta_isPaid" defaultChecked={meta.isPaid ?? false} />
              有料記事にする
            </label>
            <label htmlFor={`${idPrefix}-intro`}>書き出し案</label>
            <textarea
              id={`${idPrefix}-intro`}
              name="meta_intro"
              defaultValue={meta.intro ?? ""}
              rows={2}
              maxLength={400}
            />
          </>
        ) : null}

        {platform === "blog" ? (
          <>
            <label htmlFor={`${idPrefix}-seotitle`}>SEOタイトル案</label>
            <input
              id={`${idPrefix}-seotitle`}
              name="meta_seoTitle"
              defaultValue={meta.seoTitle ?? ""}
              maxLength={120}
              onKeyDown={guardEnter}
            />
            <label htmlFor={`${idPrefix}-metadesc`}>メタディスクリプション案</label>
            <textarea
              id={`${idPrefix}-metadesc`}
              name="meta_metaDescription"
              defaultValue={meta.metaDescription ?? ""}
              rows={2}
              maxLength={200}
            />
            <label htmlFor={`${idPrefix}-affiliate`}>アフィリエイトの見込み</label>
            <input
              id={`${idPrefix}-affiliate`}
              name="meta_affiliatePotential"
              defaultValue={meta.affiliatePotential ?? ""}
              maxLength={200}
              onKeyDown={guardEnter}
            />
          </>
        ) : null}
      </details>

      {state.error ? (
        <p className="form-error" data-testid="deliverable-form-error">
          {state.error}
        </p>
      ) : null}

      <button className="btn-sm" type="submit" disabled={pending}>
        {pending ? "保存中…" : deliverable ? "保存する" : "追加する"}
      </button>
    </form>
  );
}
