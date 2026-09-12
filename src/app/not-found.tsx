import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container" style={{ padding: "6rem 0", textAlign: "center" }}>
      <p className="label">404</p>
      <h1 style={{ margin: "0.8rem 0" }}>ページが見つかりません</h1>
      <p style={{ color: "var(--muted)" }}>お探しのページは移動したか、存在しないようです。</p>
      <p style={{ marginTop: "1.5rem" }}>
        <Link className="btn" href="/">
          トップへ戻る
        </Link>
      </p>
    </div>
  );
}
