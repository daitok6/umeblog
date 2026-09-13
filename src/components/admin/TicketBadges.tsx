import {
  PILLAR_LABEL,
  PRIORITY_LABEL,
  SIGNAL_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  type SignalLevel,
  type TicketPillar,
  type TicketPriority,
  type TicketStatus,
  type TicketTopicType,
} from "@/lib/tickets";

/**
 * Every badge here renders text, not just colour — status especially must
 * never be colour-only (accessibility, and this app already has a hard rule
 * against decorating progress with anything that reads as a warning).
 */

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`status status--${status}`}>{STATUS_LABEL[status]}</span>;
}

export function PillarBadge({ pillar }: { pillar: TicketPillar }) {
  return <span className="label ticket-pillar">{PILLAR_LABEL[pillar]}</span>;
}

export function TypeBadge({ topicType }: { topicType: TicketTopicType }) {
  return <span className="label">{TYPE_LABEL[topicType]}</span>;
}

/** Renders nothing for "normal" — priority is only shown when it stands out. */
export function PriorityMark({ priority }: { priority: TicketPriority }) {
  const label = PRIORITY_LABEL[priority];
  if (!label) return null;
  return <span className="ticket-priority">{label}</span>;
}

export function SignalRow({
  seo,
  monetization,
  social,
}: {
  seo: SignalLevel;
  monetization: SignalLevel;
  social: SignalLevel;
}) {
  const items: Array<[string, SignalLevel]> = [
    ["SEO", seo],
    ["収益化", monetization],
    ["SNS", social],
  ];
  const shown = items.filter(([, level]) => SIGNAL_LABEL[level]);
  if (shown.length === 0) return null;
  return (
    <p className="ticket-signals label">
      {shown.map(([name, level]) => (
        <span key={name} className="ticket-signals__item">
          {name} {SIGNAL_LABEL[level]}
        </span>
      ))}
    </p>
  );
}
