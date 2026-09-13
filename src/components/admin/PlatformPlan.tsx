import Link from "next/link";
import type { TicketWithMeta } from "@/lib/repo/tickets";
import { PLATFORM_LABEL } from "@/lib/deliverables";
import { ContentRoleBadge, DeliverableStatusBadge, PlatformBadge } from "@/components/admin/PlatformBadges";
import DeliverableForm from "@/components/admin/DeliverableForm";
import DeliverableActions from "@/components/admin/DeliverableActions";

const POST_STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  in_review: "確認待ち",
  scheduled: "予約済み",
  published: "公開中",
};

/**
 * The ticket detail page's "プラットフォーム" section — one <details> per
 * deliverable (summary = the compact status row, body = its edit form and
 * quick actions), plus a final "add" details holding a blank form. Same
 * <details> idiom TicketForm already uses, so it inherits keyboard access
 * and mobile behaviour for free.
 */
export default function PlatformPlan({ ticket }: { ticket: TicketWithMeta }) {
  const deliverables = ticket.deliverables;
  const byId = new Map(deliverables.map((d) => [d.id, d]));

  return (
    <section className="panel platform-plan" style={{ marginTop: "1.2rem" }}>
      <div className="panel__head">
        <h2 className="panel__title">プラットフォーム</h2>
      </div>

      {deliverables.length === 0 ? (
        <p className="hint">まだプラットフォームは決めていません。下から追加できます。</p>
      ) : (
        <div className="platform-plan__list">
          {deliverables.map((d) => {
            const source = d.sourceDeliverableId ? byId.get(d.sourceDeliverableId) : null;
            return (
              <details
                key={d.id}
                className="ticket-form__section platform-plan__item"
                data-testid={`deliverable-row-${d.id}`}
              >
                <summary className="platform-plan__summary">
                  <PlatformBadge platform={d.platform} />
                  {d.format ? <span className="label">{d.format}</span> : null}
                  <ContentRoleBadge role={d.role} />
                  <DeliverableStatusBadge status={d.status} />
                </summary>

                {d.workingTitle ? <p className="ticket-detail__desc">{d.workingTitle}</p> : null}
                {source ? (
                  <p className="hint">
                    {PLATFORM_LABEL[source.platform]}
                    {source.format ? ` ${source.format}` : ""}
                    から
                  </p>
                ) : null}

                {d.platform === "blog" && d.linkedPostId ? (
                  <p className="label">
                    ひもづく記事：
                    <Link href={`/admin/posts/${d.linkedPostId}`}>
                      {ticket.linkedPost?.id === d.linkedPostId
                        ? ticket.linkedPost.title || "無題"
                        : "記事を開く"}
                    </Link>
                    {ticket.linkedPost?.id === d.linkedPostId
                      ? ` （${POST_STATUS_LABEL[ticket.linkedPost.status] ?? ticket.linkedPost.status}）`
                      : null}
                  </p>
                ) : null}

                {d.status === "published" && d.publishedUrl ? (
                  <p className="label">
                    <a href={d.publishedUrl} target="_blank" rel="noreferrer">
                      公開URL
                    </a>
                  </p>
                ) : null}

                <DeliverableForm
                  // Remounts whenever this row changes underneath it (a quick
                  // action, a linked post, another edit) so its uncontrolled
                  // fields never show stale defaultValues from before that
                  // change — see DeliverableActions, which updates status
                  // without going through this form at all.
                  key={`${d.id}:${d.updatedAt}`}
                  ticketId={ticket.id}
                  deliverable={d}
                  siblings={deliverables
                    .filter((s) => s.id !== d.id)
                    .map((s) => ({ id: s.id, platform: s.platform, format: s.format, workingTitle: s.workingTitle }))}
                />
                <DeliverableActions
                  id={d.id}
                  ticketId={ticket.id}
                  platform={d.platform}
                  status={d.status}
                  hasLinkedPost={Boolean(d.linkedPostId)}
                />
              </details>
            );
          })}
        </div>
      )}

      <details className="ticket-form__section" data-testid="add-platform-deliverable">
        <summary>プラットフォームを追加</summary>
        <DeliverableForm
          // Remounts after each successful add, so the next one starts blank
          // instead of carrying forward whatever was just typed.
          key={deliverables.length}
          ticketId={ticket.id}
          siblings={deliverables.map((s) => ({
            id: s.id,
            platform: s.platform,
            format: s.format,
            workingTitle: s.workingTitle,
          }))}
        />
      </details>
    </section>
  );
}
