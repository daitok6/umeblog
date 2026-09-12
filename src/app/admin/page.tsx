import Link from "next/link";
import YearCalendar from "@/components/admin/YearCalendar";
import { getStats, getYearActivity } from "@/lib/repo/stats";
import { latestReply } from "@/lib/repo/replies";
import { kouFor } from "@/lib/sekki";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function greeting(daysSinceLast: number | null): { title: string; body: string } | null {
  if (daysSinceLast == null) {
    return {
      title: "はじめまして。",
      body: "一本目は、写真一枚と一行でじゅうぶんです。",
    };
  }
  // Only after a real gap, and never with a number attached. The point is to
  // make coming back easy, not to account for the absence.
  if (daysSinceLast >= 3) {
    return {
      title: "おかえりなさい。",
      body: "しばらくぶりですね。今日は短くていいので、一枚だけ置いていきませんか。",
    };
  }
  return null;
}

export default async function DashboardPage() {
  const [stats, activity, reply, user] = await Promise.all([
    getStats(),
    getYearActivity(),
    latestReply(),
    getSessionUser(),
  ]);

  const kou = kouFor();
  const greet = greeting(stats.daysSinceLast);

  return (
    <div>
      {greet ? (
        <div className="greet">
          <p className="greet__title">{greet.title}</p>
          <p className="greet__body">{greet.body}</p>
        </div>
      ) : null}

      {user?.role === "author" ? (
        <Link className="write-cta" href="/admin/posts/new?tiny=1">
          <span className="write-cta__label">今日の一枚を書く</span>
          <span className="write-cta__sub">写真1枚と一行でも、立派な一本です</span>
        </Link>
      ) : null}

      <div className="counters" style={{ marginTop: "1rem" }}>
        <div className="counter">
          <span className="counter__n">
            {stats.total}
            <span className="counter__unit">本</span>
          </span>
          <span className="counter__label label">これまで</span>
        </div>
        <div className="counter">
          <span className="counter__n">
            {stats.daysThisMonth}
            <span className="counter__unit">日</span>
          </span>
          <span className="counter__label label">今月</span>
        </div>
        <div className="counter">
          <span className="counter__n">
            {stats.bestRun}
            <span className="counter__unit">日</span>
          </span>
          <span className="counter__label label">最高記録</span>
          {/* Explicitly a past record. It cannot be lost, and nothing on this
              page ever shows a "current" streak. */}
          <span className="counter__note">これまでの最長。減りません</span>
        </div>
        <div className="counter">
          <span className="counter__n">
            {stats.exchanges}
            <span className="counter__unit">回</span>
          </span>
          <span className="counter__label label">往復</span>
        </div>
        <div className="counter">
          <span className="counter__n">
            {stats.totalViews.toLocaleString("ja-JP")}
            <span className="counter__unit">回</span>
          </span>
          <span className="counter__label label">閲覧</span>
        </div>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">
              {reply ? `${reply.authorName}さんからの返事` : "返事"}
            </h2>
            {reply ? (
              <Link className="label" href={`/p/${reply.postSlug}`}>
                記事を見る
              </Link>
            ) : null}
          </div>
          {reply ? (
            <>
              <p className="reply-card__body">{reply.body}</p>
              <p className="reply-card__meta">
                「{reply.postTitle}」へ ／{" "}
                {new Date(reply.createdAt).toLocaleDateString("ja-JP")}
              </p>
            </>
          ) : (
            <p className="reply-card__empty">
              まだ返事はありません。書けば、だれかが読みます。
            </p>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">今日の候</h2>
            <span className="label">
              {kou.sekki} {kou.phase}
            </span>
          </div>
          <p className="kou-card__name">{kou.name}</p>
          <p className="kou-card__reading">{kou.reading}</p>
          <p className="kou-card__hint">{kou.hint}</p>
          {user?.role === "author" ? (
            <p style={{ marginTop: "1.1rem" }}>
              <Link
                className="btn-sm"
                href={`/admin/posts/new?hint=${encodeURIComponent(kou.hint)}`}
              >
                これで書きはじめる
              </Link>
            </p>
          ) : null}
        </section>
      </div>

      <section className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel__head">
          <h2 className="panel__title">記録</h2>
        </div>
        <YearCalendar activity={activity} />
      </section>
    </div>
  );
}
