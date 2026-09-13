import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthor } from "@/lib/auth/session";
import { getById } from "@/lib/repo/tickets";
import { parseQuestions, PILLAR_LABEL, TYPE_LABEL } from "@/lib/tickets";
import { PillarBadge, SignalRow, TicketStatusBadge, TypeBadge } from "@/components/admin/TicketBadges";
import TicketQuickActions from "@/components/admin/TicketQuickActions";
import PlatformPlan from "@/components/admin/PlatformPlan";
import { aggregate, AGGREGATE_LABEL, crossPlatformLabel } from "@/lib/deliverables";

export const dynamic = "force-dynamic";

const POST_STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  in_review: "確認待ち",
  scheduled: "予約済み",
  published: "公開中",
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthor();
  const { id } = await params;
  const ticket = await getById(Number(id));
  if (!ticket) notFound();

  const questions = parseQuestions(ticket.suggestedQuestions);
  const agg = aggregate(ticket.deliverables);
  const cross = crossPlatformLabel(ticket.crossPlatformPotential);

  return (
    <div>
      <div className="page-head">
        <h1>{ticket.title || "無題のアイデア"}</h1>
        <Link className="btn-sm" href="/admin/tickets">
          一覧へ戻る
        </Link>
      </div>

      <div className="ticket-detail">
        <div className="ticket-detail__main">
          <div className="ticket-detail__head">
            <TicketStatusBadge status={ticket.status} />
            <PillarBadge pillar={ticket.pillar} />
            <TypeBadge topicType={ticket.topicType} />
          </div>

          {agg ? (
            <p className="ticket-aggregate label">
              プラットフォーム全体：{AGGREGATE_LABEL[agg]}
            </p>
          ) : null}
          {cross ? <p className="ticket-aggregate label">展開しやすさ：{cross}</p> : null}

          {ticket.description ? <p className="ticket-detail__desc">{ticket.description}</p> : null}

          {ticket.inspirationNotes ? (
            <section className="panel" style={{ marginTop: "1.2rem" }}>
              <div className="panel__head">
                <h2 className="panel__title">なぜ面白そうか</h2>
              </div>
              <p className="ticket-detail__text">{ticket.inspirationNotes}</p>
            </section>
          ) : null}

          {questions.length > 0 ? (
            <section className="panel" style={{ marginTop: "1.2rem" }}>
              <div className="panel__head">
                <h2 className="panel__title">聞いてみたいこと</h2>
              </div>
              <ul className="ticket-detail__questions">
                {questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {ticket.creativeIdeas ? (
            <section className="panel" style={{ marginTop: "1.2rem" }}>
              <div className="panel__head">
                <h2 className="panel__title">絵にするなら</h2>
              </div>
              <p className="ticket-detail__text">{ticket.creativeIdeas}</p>
            </section>
          ) : null}

          {ticket.tags.length > 0 ? (
            <p className="ticket-detail__tags">
              {ticket.tags.map((t) => (
                <span key={t.id} className="label ticket-card__tag">
                  #{t.name}
                </span>
              ))}
            </p>
          ) : null}

          <PlatformPlan ticket={ticket} />

          <p className="hint" style={{ marginTop: "1.4rem" }}>
            手ごたえのめやす（あくまで目安です）
          </p>
          <SignalRow
            seo={ticket.seoPotential}
            monetization={ticket.monetizationPotential}
            social={ticket.socialPotential}
          />
          {ticket.evergreen || ticket.seasonal ? (
            <p className="label">
              {ticket.evergreen ? "定番ネタ" : null}
              {ticket.evergreen && ticket.seasonal ? " ／ " : null}
              {ticket.seasonal ? "季節もの" : null}
            </p>
          ) : null}
        </div>

        <aside className="editor-side">
          <div className="side-panel">
            <h3>このアイデアで</h3>
            <TicketQuickActions id={ticket.id} status={ticket.status} />
          </div>

          <div className="side-panel">
            <h3>ひもづく記事</h3>
            {ticket.linkedPost ? (
              <>
                <p>
                  <Link href={`/admin/posts/${ticket.linkedPost.id}`}>{ticket.linkedPost.title || "無題"}</Link>
                </p>
                <p className="label">{POST_STATUS_LABEL[ticket.linkedPost.status] ?? ticket.linkedPost.status}</p>
              </>
            ) : (
              <p className="hint">まだ記事にはなっていません。</p>
            )}
          </div>

          <div className="side-panel">
            <h3>柱・種類</h3>
            <p className="label">{PILLAR_LABEL[ticket.pillar]}</p>
            <p className="label">{TYPE_LABEL[ticket.topicType]}</p>
          </div>

          <div className="side-panel">
            <h3>編集</h3>
            <p>
              <Link className="btn-sm" href={`/admin/tickets/${ticket.id}/edit`}>
                編集する
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
