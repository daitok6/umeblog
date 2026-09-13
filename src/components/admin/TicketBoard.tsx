import Link from "next/link";
import type { TicketWithMeta } from "@/lib/repo/tickets";
import { BOARD_STATUSES, STATUS_LABEL } from "@/lib/tickets";
import { PillarBadge, PriorityMark } from "@/components/admin/TicketBadges";
import PlatformSummary from "@/components/admin/PlatformSummary";

/**
 * A lightweight status board — CSS grid columns, no drag-and-drop. Moving a
 * card between columns still goes through the same status buttons as the
 * list view (on the ticket's own detail page), reached by opening the card.
 */
export default function TicketBoard({ tickets }: { tickets: TicketWithMeta[] }) {
  return (
    <div className="ticket-board">
      {BOARD_STATUSES.map((status) => {
        const items = tickets.filter((t) => t.status === status);
        return (
          <div key={status} className="ticket-board__col">
            <div className="ticket-board__col-head">
              <span className="ticket-board__col-title">{STATUS_LABEL[status]}</span>
              <span className="label">{items.length}</span>
            </div>
            <div className="ticket-board__col-body">
              {items.length === 0 ? (
                <p className="hint">ここにはまだありません。</p>
              ) : (
                items.map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/tickets/${t.id}`}
                    className="ticket-board__card"
                    data-testid={`ticket-board-card-${t.id}`}
                  >
                    <p className="ticket-board__card-title">{t.title || "無題のアイデア"}</p>
                    <div className="ticket-board__card-meta">
                      <PillarBadge pillar={t.pillar} />
                      <PriorityMark priority={t.priority} />
                    </div>
                    <PlatformSummary deliverables={t.deliverables} emptyHint="" />
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
