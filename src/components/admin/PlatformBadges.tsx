import {
  DELIVERABLE_STATUS_LABEL,
  PLATFORM_LABEL,
  ROLE_LABEL,
  STATUS_MARK,
  type ContentRole,
  type DeliverableStatus,
  type Platform,
} from "@/lib/deliverables";

/**
 * Same rule as TicketBadges: every badge renders text, not just colour or a
 * mark — status must never be distinguishable by shape/colour alone.
 */

export function PlatformBadge({ platform }: { platform: Platform }) {
  return <span className={`label platform platform--${platform}`}>{PLATFORM_LABEL[platform]}</span>;
}

export function ContentRoleBadge({ role }: { role: ContentRole }) {
  const label = ROLE_LABEL[role];
  if (!label) return null;
  return <span className="label content-role">{label}</span>;
}

export function DeliverableStatusBadge({ status }: { status: DeliverableStatus }) {
  return (
    <span className={`status status--${status}`}>
      <span aria-hidden="true">{STATUS_MARK[status]}</span> {DELIVERABLE_STATUS_LABEL[status]}
    </span>
  );
}
