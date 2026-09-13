import Link from "next/link";
import type { TicketWithMeta } from "@/lib/repo/tickets";
import { PillarBadge, PriorityMark, TicketStatusBadge, TypeBadge } from "@/components/admin/TicketBadges";

function fmt(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Deliberately spare — title, a few badges, tags, description, date. The
 * three business signals and evergreen/seasonal only ever show as small
 * muted marks, never as the headline of the card.
 */
export default function TicketCard({ ticket }: { ticket: TicketWithMeta }) {
  const hasSignal =
    ticket.seoPotential !== "none" || ticket.monetizationPotential !== "none" || ticket.socialPotential !== "none";

  return (
    <Link href={`/admin/tickets/${ticket.id}`} className="ticket-card" data-testid={`ticket-card-${ticket.id}`}>
      <div className="ticket-card__head">
        <TicketStatusBadge status={ticket.status} />
        <PriorityMark priority={ticket.priority} />
      </div>
      <h3 className="ticket-card__title">{ticket.title || "無題のアイデア"}</h3>
      {ticket.description ? <p className="ticket-card__desc">{ticket.description}</p> : null}
      <div className="ticket-card__meta">
        <PillarBadge pillar={ticket.pillar} />
        <TypeBadge topicType={ticket.topicType} />
      </div>
      {ticket.tags.length > 0 ? (
        <p className="ticket-card__tags">
          {ticket.tags.map((t) => (
            <span key={t.id} className="label ticket-card__tag">
              #{t.name}
            </span>
          ))}
        </p>
      ) : null}
      <div className="ticket-card__foot">
        <span className="label">{fmt(ticket.createdAt)}</span>
        {ticket.evergreen ? <span className="label">定番</span> : null}
        {ticket.seasonal ? <span className="label">季節もの</span> : null}
        {hasSignal ? <span className="label">手ごたえあり</span> : null}
      </div>
    </Link>
  );
}
