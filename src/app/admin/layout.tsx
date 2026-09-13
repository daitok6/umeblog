import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { countByStatus } from "@/lib/repo/comments";
import { logoutAction } from "@/app/actions/auth";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const counts = await countByStatus();

  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="admin-bar__inner">
          <Link href="/admin" className="admin-bar__logo">
            うめ
          </Link>
          <nav className="admin-bar__nav">
            <Link href="/admin">ホーム</Link>
            <Link href="/admin/posts">記事</Link>
            {user.role === "author" ? <Link href="/admin/tickets">アイデア</Link> : null}
            <Link href="/admin/comments">
              コメント
              {counts.pending > 0 ? (
                <span className="admin-bar__pending">{counts.pending}</span>
              ) : null}
            </Link>
            {user.role === "author" ? <Link href="/admin/insights">分析</Link> : null}
            {user.role === "author" ? <Link href="/admin/settings">設定</Link> : null}
            <Link href="/" target="_blank" rel="noopener">
              サイトを見る
            </Link>
          </nav>
          <form action={logoutAction} className="admin-bar__logout-form">
            <button className="admin-bar__logout" type="submit">
              ログアウト（{user.name}）
            </button>
          </form>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
