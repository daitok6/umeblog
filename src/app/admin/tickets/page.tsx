import Link from "next/link";
import { requireAuthor } from "@/lib/auth/session";
import * as ticketsRepo from "@/lib/repo/tickets";
import TicketCard from "@/components/admin/TicketCard";
import TicketBoard from "@/components/admin/TicketBoard";
import TicketFilters from "@/components/admin/TicketFilters";
import { isPillar, isPriority, isStatus, isTopicType, isSignalLevel } from "@/lib/tickets";
import { isPlatform, isDeliverableStatus, isContentRole } from "@/lib/deliverables";

export const dynamic = "force-dynamic";

type SP = {
  view?: string;
  scope?: string;
  status?: string;
  pillar?: string;
  topicType?: string;
  priority?: string;
  tag?: string;
  evergreen?: string;
  seasonal?: string;
  q?: string;
  platform?: string;
  dstatus?: string;
  role?: string;
  plan?: string;
  cross?: string;
};

/** Preserves every filter param except the ones a tab link overrides. */
function tabHref(sp: SP, overrides: Partial<SP>): string {
  const merged: SP = { ...sp, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return `/admin/tickets${qs ? `?${qs}` : ""}`;
}

export default async function TicketsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAuthor();
  const sp = await searchParams;

  const view = sp.view === "board" ? "board" : "list";
  const scope = sp.scope === "all" ? "all" : "active";
  const status = sp.status && sp.status !== "active" ? sp.status : undefined;

  const filters: ticketsRepo.TicketFilters = {
    scope: scope === "all" ? "all" : "active",
    ...(isStatus(status) ? { status } : {}),
    ...(isPillar(sp.pillar) ? { pillar: sp.pillar } : {}),
    ...(isTopicType(sp.topicType) ? { topicType: sp.topicType } : {}),
    ...(isPriority(sp.priority) ? { priority: sp.priority } : {}),
    ...(sp.tag ? { tag: sp.tag } : {}),
    evergreen: sp.evergreen === "1",
    seasonal: sp.seasonal === "1",
    q: sp.q,
    ...(isPlatform(sp.platform) ? { platform: sp.platform } : {}),
    ...(isDeliverableStatus(sp.dstatus) ? { deliverableStatus: sp.dstatus } : {}),
    ...(isContentRole(sp.role) && sp.role !== "none" ? { role: sp.role } : {}),
    ...(sp.plan === "with" || sp.plan === "without" ? { plan: sp.plan } : {}),
    ...(isSignalLevel(sp.cross) && sp.cross !== "none" ? { crossPlatform: sp.cross } : {}),
  };

  const [tickets, tagOptions] = await Promise.all([
    ticketsRepo.list(filters),
    ticketsRepo.listTagNames(),
  ]);

  const hasFilters = Boolean(
    sp.pillar ||
      sp.topicType ||
      sp.priority ||
      sp.tag ||
      sp.evergreen ||
      sp.seasonal ||
      sp.q ||
      sp.platform ||
      sp.dstatus ||
      sp.role ||
      sp.plan ||
      sp.cross,
  );

  return (
    <div>
      <div className="page-head">
        <h1>アイデア</h1>
        <Link className="btn" href="/admin/tickets/new">
          アイデアを追加
        </Link>
      </div>
      <p className="hint">
        気になるテーマを集めておく場所です。書く義務はありません — 気が向いたものから選んでください。
      </p>

      <div className="tabs">
        <Link href={tabHref(sp, { status: undefined, scope: undefined })} aria-current={!status && scope === "active"}>
          活動中
        </Link>
        <Link href={tabHref(sp, { status: "selected", scope: undefined })} aria-current={status === "selected"}>
          書きたい
        </Link>
        <Link href={tabHref(sp, { status: "in_progress", scope: undefined })} aria-current={status === "in_progress"}>
          執筆中
        </Link>
        <Link href={tabHref(sp, { status: "published", scope: "all" })} aria-current={status === "published"}>
          公開済み
        </Link>
        <Link href={tabHref(sp, { status: "archived", scope: "all" })} aria-current={status === "archived"}>
          保留
        </Link>
        <Link href={tabHref(sp, { status: undefined, scope: "all" })} aria-current={!status && scope === "all"}>
          すべて
        </Link>
        <span className="toolbar__spacer" />
        <Link href={tabHref(sp, { view: undefined })} aria-current={view === "list"}>
          一覧
        </Link>
        <Link href={tabHref(sp, { view: "board" })} aria-current={view === "board"}>
          ボード
        </Link>
      </div>

      <div className="tabs tabs--platform">
        <Link href={tabHref(sp, { platform: undefined })} aria-current={!sp.platform}>
          すべて
        </Link>
        <Link href={tabHref(sp, { platform: "instagram" })} aria-current={sp.platform === "instagram"}>
          Instagram
        </Link>
        <Link href={tabHref(sp, { platform: "note" })} aria-current={sp.platform === "note"}>
          note
        </Link>
        <Link href={tabHref(sp, { platform: "blog" })} aria-current={sp.platform === "blog"}>
          ブログ
        </Link>
      </div>

      <TicketFilters
        view={view}
        scope={scope}
        pillar={sp.pillar ?? ""}
        topicType={sp.topicType ?? ""}
        priority={sp.priority ?? ""}
        tag={sp.tag ?? ""}
        evergreen={sp.evergreen === "1"}
        seasonal={sp.seasonal === "1"}
        q={sp.q ?? ""}
        tagOptions={tagOptions}
        platform={sp.platform ?? ""}
        deliverableStatus={sp.dstatus ?? ""}
        role={sp.role ?? ""}
        plan={sp.plan ?? ""}
        crossPlatform={sp.cross ?? ""}
      />

      {tickets.length === 0 ? (
        <p className="hint">
          {hasFilters
            ? "条件に合うアイデアが見つかりませんでした。"
            : "まだアイデアがありません。気になるテーマを追加してみましょう。"}
        </p>
      ) : view === "board" ? (
        <TicketBoard tickets={tickets} />
      ) : (
        <div className="ticket-grid">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}
