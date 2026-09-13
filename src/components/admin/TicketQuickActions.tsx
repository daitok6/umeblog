"use client";

import { useTransition } from "react";
import {
  createPostFromTicketAction,
  deleteTicketAction,
  setTicketStatusAction,
} from "@/app/actions/tickets";
import type { TicketStatus } from "@/lib/tickets";

/**
 * The full set of moves is intentionally available from any status — moving
 * straight from "アイデア" to "執筆中" is fine, nothing here enforces a
 * linear path.
 */
export default function TicketQuickActions({
  id,
  status,
  compact = false,
}: {
  id: number;
  status: TicketStatus;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) => start(() => void fn());

  const setStatus = (s: TicketStatus) => run(() => setTicketStatusAction(id, s));

  return (
    <div className={compact ? "queue-actions queue-actions--compact" : "queue-actions"}>
      {status !== "interested" && status !== "selected" && status !== "in_progress" ? (
        <button className="btn-sm" type="button" disabled={pending} onClick={() => setStatus("interested")}>
          気になる
        </button>
      ) : null}
      {status !== "selected" && status !== "in_progress" ? (
        <button className="btn-sm" type="button" disabled={pending} onClick={() => setStatus("selected")}>
          書きたい
        </button>
      ) : null}
      {status !== "in_progress" && status !== "draft_ready" ? (
        <button
          className="btn-sm"
          type="button"
          disabled={pending}
          onClick={() => run(() => createPostFromTicketAction(id))}
        >
          この案で書きはじめる
        </button>
      ) : null}
      {status === "in_progress" ? (
        <button className="btn-sm" type="button" disabled={pending} onClick={() => setStatus("draft_ready")}>
          下書き完成
        </button>
      ) : null}
      {status !== "archived" ? (
        <button className="btn-sm" type="button" disabled={pending} onClick={() => setStatus("archived")}>
          保留にする
        </button>
      ) : (
        <button className="btn-sm" type="button" disabled={pending} onClick={() => setStatus("idea")}>
          もどす
        </button>
      )}
      {!compact ? (
        <button
          className="btn-sm btn-sm--danger"
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("このアイデアを削除します。元に戻せません。")) {
              run(() => deleteTicketAction(id));
            }
          }}
        >
          削除
        </button>
      ) : null}
    </div>
  );
}
