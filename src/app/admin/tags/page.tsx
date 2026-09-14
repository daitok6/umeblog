import { requireAuthor } from "@/lib/auth/session";
import { listForCuration } from "@/lib/repo/tags";
import { saveTagChipsAction, deleteTagAction } from "@/app/actions/tags";

export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  await requireAuthor();
  const tags = await listForCuration();

  return (
    <div>
      <div className="page-head">
        <h1>タグ</h1>
      </div>

      <p className="hint">
        チェックを入れたタグだけが、ブログのタグ絞り込みとフッターに並びます。並び順は数字が小さいほど先に出ます。空欄のときは他のタグより後ろになります。
      </p>

      <form action={saveTagChipsAction}>
        <table className="admin-table tag-curation">
          <thead>
            <tr>
              <th>表示</th>
              <th>タグ</th>
              <th>記事数</th>
              <th>並び順</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tags.map((t) => (
              <tr key={t.slug}>
                <td>
                  <label className="simple-toggle">
                    <input type="checkbox" name="chip" value={t.slug} defaultChecked={t.chipOrder != null} />
                  </label>
                </td>
                <td>{t.name}</td>
                <td className="label">{t.count > 0 ? t.count : "—"}</td>
                <td>
                  <input
                    type="number"
                    name={`order-${t.slug}`}
                    defaultValue={t.chipOrder ?? ""}
                    min={1}
                    max={99}
                    inputMode="numeric"
                    aria-label={`${t.name} の並び順`}
                    className="tag-curation__order"
                  />
                </td>
                <td>
                  {!t.attached ? (
                    <button
                      type="submit"
                      formAction={deleteTagAction.bind(null, t.slug)}
                      className="btn-sm btn-sm--danger"
                    >
                      削除
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="btn" type="submit" style={{ marginTop: "1rem" }}>
          保存する
        </button>
      </form>
    </div>
  );
}
