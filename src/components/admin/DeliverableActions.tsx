"use client";

import { useTransition } from "react";
import {
  createPostFromDeliverableAction,
  deleteDeliverableAction,
  setDeliverableStatusAction,
} from "@/app/actions/deliverables";
import type { DeliverableStatus, Platform } from "@/lib/deliverables";

/**
 * Quick status moves for one platform deliverable — same unconstrained-
 * transition idiom as TicketQuickActions. idea -> published is legal, and so
 * is idea -> skipped: skipping a platform is an ordinary choice, not a
 * failure, so it gets its own plain button rather than living behind a
 * "delete" action.
 */
export default function DeliverableActions({
  id,
  ticketId,
  platform,
  status,
  hasLinkedPost,
}: {
  id: number;
  ticketId: number;
  platform: Platform;
  status: DeliverableStatus;
  hasLinkedPost: boolean;
}) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) => start(() => void fn());
  const setStatus = (s: DeliverableStatus) => run(() => setDeliverableStatusAction(id, ticketId, s));

  return (
    <div className="queue-actions queue-actions--compact">
      {status !== "interested" && status !== "selected" && status !== "in_progress" ? (
        <button className="btn-sm" type="button" disabled={pending} onClick={() => setStatus("interested")}>
          気になる
        </button>
      ) : null}
      {status !== "selected" && status !== "in_progress" ? (
        <button className="btn-sm" type="button" disabled={pending} onClick={() => setStatus("selected")}>
          つくりたい
        </button>
      ) : null}
      {status !== "in_progress" && status !== "draft_ready" ? (
        <button className="btn-sm" type="button" disabled={pending} onClick={() => setStatus("in_progress")}>
          制作中にする
        </button>
      ) : null}
      {platform === "blog" && !hasLinkedPost ? (
        <button
          className="btn-sm"
          type="button"
          disabled={pending}
          onClick={() => run(() => createPostFromDeliverableAction(id))}
        >
          この案でブログを書きはじめる
        </button>
      ) : null}
      {status !== "published" ? (
        <button className="btn-sm" type="button" disabled={pending} onClick={() => setStatus("published")}>
          公開した
        </button>
      ) : null}
      {status !== "skipped" ? (
        <button className="btn-sm" type="button" disabled={pending} onClick={() => setStatus("skipped")}>
          今回はやらない
        </button>
      ) : (
        <button className="btn-sm" type="button" disabled={pending} onClick={() => setStatus("idea")}>
          もどす
        </button>
      )}
      <button
        className="btn-sm btn-sm--danger"
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("このプラットフォーム版を削除します。元に戻せません。")) {
            run(() => deleteDeliverableAction(id, ticketId));
          }
        }}
      >
        削除
      </button>
    </div>
  );
}
