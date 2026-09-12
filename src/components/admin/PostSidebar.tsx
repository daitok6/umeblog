"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  publishAction,
  scheduleAction,
  submitForReviewAction,
  backToDraftAction,
  unpublishAction,
  deletePostAction,
} from "@/app/actions/posts";

type Props = {
  postId: number;
  status: "draft" | "in_review" | "scheduled" | "published";
  slug: string;
  serial: number | null;
  publishAt: number | null;
};

const STATUS_LABEL: Record<Props["status"], string> = {
  draft: "下書き",
  in_review: "確認待ち",
  scheduled: "予約済み",
  published: "公開中",
};

function toLocalInput(ms: number | null): string {
  const d = ms ? new Date(ms) : new Date(Date.now() + 86400000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostSidebar({ postId, status, slug, serial, publishAt }: Props) {
  const [pending, start] = useTransition();
  const [when, setWhen] = useState(() => toLocalInput(publishAt));

  const run = (fn: () => Promise<void>) => start(() => void fn());

  return (
    <aside className="editor-side">
      <div className="side-panel">
        <h3>状態</h3>
        <p>
          <span className={`status status--${status}`}>{STATUS_LABEL[status]}</span>
          {serial != null ? (
            <span className="label" style={{ marginLeft: "0.6rem" }}>
              No. {String(serial).padStart(3, "0")}
            </span>
          ) : null}
        </p>
        {status === "published" ? (
          <p style={{ marginTop: "0.8rem" }}>
            <Link className="label" href={`/p/${slug}`} target="_blank" rel="noopener">
              公開ページを見る →
            </Link>
          </p>
        ) : null}
      </div>

      <div className="side-panel">
        <h3>公開する</h3>
        <div className="side-actions">
          {status !== "published" ? (
            <button
              className="btn"
              type="button"
              disabled={pending}
              onClick={() => run(() => publishAction(postId))}
            >
              公開する
            </button>
          ) : (
            <button
              className="btn-sm"
              type="button"
              disabled={pending}
              onClick={() => run(() => unpublishAction(postId))}
            >
              公開を取り消す
            </button>
          )}

          {/* Same visual weight as publishing. Saving for later must never
              feel like the lesser choice. */}
          <Link className="btn-sm" href="/admin/posts">
            あとで読み返す
          </Link>

          {status === "draft" ? (
            <button
              className="btn-sm"
              type="button"
              disabled={pending}
              onClick={() => run(() => submitForReviewAction(postId))}
            >
              確認をお願いする
            </button>
          ) : null}

          {status === "in_review" ? (
            <button
              className="btn-sm"
              type="button"
              disabled={pending}
              onClick={() => run(() => backToDraftAction(postId))}
            >
              下書きに戻す
            </button>
          ) : null}
        </div>
      </div>

      <div className="side-panel">
        <h3>予約する</h3>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          aria-label="公開日時"
        />
        <div className="side-actions" style={{ marginTop: "0.6rem" }}>
          <button
            className="btn-sm"
            type="button"
            disabled={pending}
            onClick={() => run(() => scheduleAction(postId, when))}
          >
            この日時に公開
          </button>
        </div>
      </div>

      <div className="side-panel">
        <h3>削除</h3>
        <button
          className="btn-sm btn-sm--danger"
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("この記事を削除します。元に戻せません。")) {
              run(() => deletePostAction(postId));
            }
          }}
        >
          削除する
        </button>
      </div>
    </aside>
  );
}
