import Link from "next/link";
import { requireAuthor } from "@/lib/auth/session";
import { listShortLinks } from "@/lib/repo/shortLinks";
import { getShortLinkClicks } from "@/lib/repo/insights";
import { deleteShortLinkAction } from "@/app/actions/shortLinks";
import ShortLinkForm from "@/components/admin/ShortLinkForm";

export const dynamic = "force-dynamic";

function fmt(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default async function ShortLinksPage() {
  await requireAuthor();
  const [links, clicks] = await Promise.all([listShortLinks(), getShortLinkClicks()]);

  return (
    <div>
      <div className="page-head">
        <h1>短縮リンク</h1>
        <Link className="label" href="/admin/insights">
          分析に戻る
        </Link>
      </div>
      <p className="label" style={{ margin: "0 0 1rem" }}>
        UTMパラメータを付けにくい場所（プロフィール欄、印刷物のQRコードなど）向けの転送リンクです。
      </p>

      <ShortLinkForm />

      {links.length === 0 ? (
        <p className="label">まだ短縮リンクはありません。</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>コード</th>
              <th>リンク先</th>
              <th>メモ</th>
              <th>クリック</th>
              <th>作成日</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id}>
                <td>
                  <code>/go/{l.code}</code>
                </td>
                <td className="label" style={{ maxWidth: 280, overflowWrap: "break-word" }}>
                  {l.destination}
                </td>
                <td className="label">{l.label || "—"}</td>
                <td className="label">{(clicks.get(l.code) ?? 0).toLocaleString("ja-JP")}</td>
                <td className="label">{fmt(l.createdAt)}</td>
                <td>
                  <form action={deleteShortLinkAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="btn-sm btn-sm--danger" type="submit">
                      削除
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
