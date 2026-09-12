import Link from "next/link";
import { listAll } from "@/lib/repo/posts";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  in_review: "確認待ち",
  scheduled: "予約済み",
  published: "公開中",
};

function fmt(ms: number | null): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AdminPostsPage() {
  const [posts, user] = await Promise.all([listAll(), getSessionUser()]);

  return (
    <div>
      <div className="page-head">
        <h1>記事</h1>
        {user?.role === "author" ? (
          <Link className="btn" href="/admin/posts/new">
            新しく書く
          </Link>
        ) : null}
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>タイトル</th>
            <th>状態</th>
            <th>公開日</th>
            <th>返事</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id}>
              <td className="serial" style={{ fontSize: "14px", color: "var(--faint)" }}>
                {p.serial != null ? String(p.serial).padStart(3, "0") : "—"}
              </td>
              <td>
                <Link href={`/admin/posts/${p.id}`}>{p.title || "無題"}</Link>
                {p.isTiny ? <span className="label"> 一枚</span> : null}
              </td>
              <td>
                <span className={`status status--${p.status}`}>{STATUS_LABEL[p.status]}</span>
              </td>
              <td className="label">{fmt(p.publishedAt ?? p.publishAt)}</td>
              <td className="label">{p.replyCount > 0 ? `${p.replyCount}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
