"use client";

import { useTransition } from "react";
import {
  approveCommentAction,
  rejectCommentAction,
  markSpamAction,
  deleteCommentAction,
} from "@/app/actions/moderation";

export default function QueueActions({
  id,
  status,
}: {
  id: number;
  status: "pending" | "approved" | "rejected" | "spam";
}) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) => start(() => void fn());

  return (
    <div className="queue-actions">
      {status !== "approved" ? (
        <button
          className="btn-sm"
          type="button"
          disabled={pending}
          onClick={() => run(() => approveCommentAction(id))}
          data-testid={`approve-${id}`}
        >
          公開する
        </button>
      ) : (
        <button
          className="btn-sm"
          type="button"
          disabled={pending}
          onClick={() => run(() => rejectCommentAction(id))}
        >
          非公開にする
        </button>
      )}
      {status !== "spam" ? (
        <button
          className="btn-sm"
          type="button"
          disabled={pending}
          onClick={() => run(() => markSpamAction(id))}
        >
          迷惑として保留
        </button>
      ) : null}
      <button
        className="btn-sm btn-sm--danger"
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("このコメントを削除します。")) run(() => deleteCommentAction(id));
        }}
      >
        削除
      </button>
    </div>
  );
}
