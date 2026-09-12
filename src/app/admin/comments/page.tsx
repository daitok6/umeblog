import Link from "next/link";
import { listForModeration, countByStatus } from "@/lib/repo/comments";
import QueueActions from "@/components/admin/QueueActions";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "pending", label: "確認待ち" },
  { key: "approved", label: "公開中" },
  { key: "spam", label: "自動保留" },
  { key: "rejected", label: "非公開" },
] as const;

type Status = (typeof TABS)[number]["key"];

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = (TABS.find((t) => t.key === sp.status)?.key ?? "pending") as Status;

  const [items, counts] = await Promise.all([listForModeration(status), countByStatus()]);

  return (
    <div>
      <div className="page-head">
        <h1>コメント</h1>
      </div>

      <p className="hint">
        いただいたコメントは、承認するまで読者には表示されません。リンクを含むもの、NGワードを含むものは
        自動で「自動保留」に入ります。最初は承認制のまま運用して、荒れなければ緩めてください。
      </p>

      <div className="tabs">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/comments?status=${t.key}`}
            aria-current={t.key === status}
          >
            {t.label}
            <span className="label">{counts[t.key] ?? 0}</span>
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="hint">ここには何もありません。</p>
      ) : (
        items.map((c) => (
          <div key={c.id} className="queue-item">
            <div className="queue-item__head">
              <span className="queue-item__name">{c.authorName}</span>
              <span className="label">
                {new Date(c.createdAt).toLocaleString("ja-JP")}
              </span>
              <Link className="label" href={`/p/${c.postSlug}`} target="_blank" rel="noopener">
                「{c.postTitle}」
              </Link>
            </div>
            <p className="queue-item__body">{c.body}</p>
            {c.flaggedReason ? <p className="queue-item__flag">{c.flaggedReason}</p> : null}
            <QueueActions id={c.id} status={c.status} />
          </div>
        ))
      )}
    </div>
  );
}
