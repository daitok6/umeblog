import type { TicketDeliverable } from "@/lib/db/schema";
import { DELIVERABLE_STATUS_LABEL, PLATFORM_SHORT_LABEL, STATUS_MARK } from "@/lib/deliverables";

/**
 * The compact platform-progress block used on ticket cards and board cards.
 * Pure, non-interactive markup — TicketCard is itself a <Link>, so nothing
 * clickable may live inside it. Detail/editing happens on the ticket page.
 */
export default function PlatformSummary({
  deliverables,
  emptyHint = "プラットフォームはまだ決めていません",
}: {
  deliverables: TicketDeliverable[];
  emptyHint?: string;
}) {
  if (deliverables.length === 0) {
    if (!emptyHint) return null;
    return <p className="hint platform-summary__empty">{emptyHint}</p>;
  }

  return (
    <ul className="platform-summary">
      {deliverables.map((d) => (
        <li key={d.id} className="platform-summary__row">
          <span className="platform-summary__platform">{PLATFORM_SHORT_LABEL[d.platform]}</span>
          <span aria-hidden="true">{STATUS_MARK[d.status]}</span>
          <span className="platform-summary__status">{DELIVERABLE_STATUS_LABEL[d.status]}</span>
        </li>
      ))}
    </ul>
  );
}
