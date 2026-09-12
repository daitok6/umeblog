import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div style={{ padding: "4rem 0", textAlign: "center" }}>
      <p className="label">404</p>
      <h1 style={{ margin: "0.8rem 0" }}>見つかりませんでした</h1>
      <p style={{ color: "var(--muted)" }}>その記事は存在しないか、削除された可能性があります。</p>
      <p style={{ marginTop: "1.5rem" }}>
        <Link className="btn" href="/admin/posts">
          記事一覧へ戻る
        </Link>
      </p>
    </div>
  );
}
