import Link from "next/link";
import { requireAuthor } from "@/lib/auth/session";
import { dayBucket } from "@/lib/analytics/identity";
import {
  getPostInsights,
  getSourceBreakdown,
  getCampaignBreakdown,
  getDailyTrend,
  getSearchInsights,
  getOutboundClicks,
  type TrendPoint,
} from "@/lib/repo/insights";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  search: "検索",
  social: "SNS",
  ai: "AIアシスタント",
  newsletter: "メール",
  direct: "直接・ブックマーク",
  internal: "サイト内",
  other: "その他",
};

function fillTrend(trend: TrendPoint[], days: number): TrendPoint[] {
  const byDay = new Map(trend.map((t) => [t.day, t]));
  const out: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayBucket(Date.now() - i * 86_400_000);
    out.push(byDay.get(day) ?? { day, views: 0, reads: 0 });
  }
  return out;
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="bar-row">
      <span className="bar-row__label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-row__value">{value.toLocaleString("ja-JP")}</span>
    </div>
  );
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const max = Math.max(1, ...trend.map((t) => t.views));
  return (
    <div className="scroll-chart" style={{ height: 64 }}>
      {trend.map((t) => (
        <div
          key={t.day}
          className="scroll-chart__bar scroll-chart__bar--fill"
          style={{ height: `${Math.max(2, (t.views / max) * 100)}%` }}
          title={`${t.day}: ${t.views}閲覧 / ${t.reads}読了`}
        />
      ))}
    </div>
  );
}

function ScrollDropoff({ buckets }: { buckets: number[] }) {
  const max = Math.max(1, ...buckets);
  const total = buckets.reduce((a, b) => a + b, 0);
  if (total === 0) return <span className="label">—</span>;
  return (
    <div className="scroll-chart" title="スクロール到達分布（左:序盤〜右:最後まで）">
      {buckets.map((n, i) => (
        <div
          key={i}
          className={`scroll-chart__bar ${n > 0 ? "scroll-chart__bar--fill" : ""}`}
          style={{ height: `${Math.max(2, (n / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAuthor();
  const sp = await searchParams;
  const days = sp.days === "7" ? 7 : sp.days === "90" ? 90 : 30;
  const since = Date.now() - days * 86_400_000;

  const [postInsights, sources, campaigns, trendRaw, search, clicks] = await Promise.all([
    getPostInsights(30),
    getSourceBreakdown(since),
    getCampaignBreakdown(since),
    getDailyTrend(days),
    getSearchInsights(),
    getOutboundClicks(since),
  ]);

  const trend = fillTrend(trendRaw, days);
  const totalSourceViews = sources.reduce((a, b) => a + b.views, 0);
  const totalCampaignViews = Math.max(1, ...campaigns.map((c) => c.views));
  const totalClicks = Math.max(1, ...clicks.map((c) => c.clicks));

  return (
    <div>
      <div className="page-head">
        <h1>分析</h1>
        <Link className="label" href="/admin/insights/links">
          短縮リンクを管理
        </Link>
      </div>

      <div className="tabs">
        <Link href="/admin/insights?days=7" aria-current={days === 7}>
          7日間
        </Link>
        <Link href="/admin/insights?days=30" aria-current={days === 30}>
          30日間
        </Link>
        <Link href="/admin/insights?days=90" aria-current={days === 90}>
          90日間
        </Link>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">流入元</h2>
          </div>
          {sources.length === 0 ? (
            <p className="insights-empty">まだデータがありません。</p>
          ) : (
            sources.map((s) => (
              <Bar
                key={s.source}
                label={SOURCE_LABEL[s.source] ?? s.source}
                value={s.views}
                total={totalSourceViews}
              />
            ))
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">推移</h2>
            <span className="label">閲覧数・日別</span>
          </div>
          {trend.every((t) => t.views === 0) ? (
            <p className="insights-empty">まだデータがありません。</p>
          ) : (
            <TrendChart trend={trend} />
          )}
        </section>
      </div>

      <section className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel__head">
          <h2 className="panel__title">記事ごとの読了率</h2>
          <span className="label">直近の公開記事30本</span>
        </div>
        {postInsights.length === 0 ? (
          <p className="insights-empty">まだデータがありません。</p>
        ) : (
          <table className="admin-table insights-table">
            <thead>
              <tr>
                <th>タイトル</th>
                <th>閲覧</th>
                <th>読了</th>
                <th>読了率</th>
                <th>滞在（中央値）</th>
                <th>スクロール到達</th>
              </tr>
            </thead>
            <tbody>
              {postInsights.map((p) => (
                <tr key={p.postId}>
                  <td>
                    <Link href={`/p/${p.slug}`} target="_blank" rel="noopener">
                      {p.title}
                    </Link>
                  </td>
                  <td className="label">{p.views > 0 ? p.views.toLocaleString("ja-JP") : "—"}</td>
                  <td className="label">{p.reads > 0 ? p.reads.toLocaleString("ja-JP") : "—"}</td>
                  <td className="label">
                    {p.readRate != null ? `${Math.round(p.readRate * 100)}%` : "—"}
                  </td>
                  <td className="label">
                    {p.medianDwellMs != null ? `${Math.round(p.medianDwellMs / 1000)}秒` : "—"}
                  </td>
                  <td style={{ minWidth: 90 }}>
                    <ScrollDropoff buckets={p.scrollBuckets} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="dash-grid" style={{ marginTop: "1rem" }}>
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">キャンペーン</h2>
          </div>
          {campaigns.length === 0 ? (
            <p className="insights-empty">
              utm_campaignの付いた流入はまだありません。
            </p>
          ) : (
            campaigns.map((c) => (
              <Bar
                key={`${c.campaign}:${c.medium}`}
                label={c.medium ? `${c.campaign}（${c.medium}）` : c.campaign}
                value={c.views}
                total={totalCampaignViews}
              />
            ))
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">検索</h2>
            <span className="label">{search.totalSearches}件</span>
          </div>
          <h3 className="label" style={{ marginBottom: "0.4rem" }}>
            ゼロ件だった検索 — 次に書くもののヒント
          </h3>
          {search.recentZeroResult.length === 0 ? (
            <p className="insights-empty">ゼロ件の検索はありません。</p>
          ) : (
            <ul style={{ margin: "0 0 1rem", paddingLeft: "1.2rem" }}>
              {search.recentZeroResult.map((r, i) => (
                <li key={i} className="label">
                  「{r.q}」
                </li>
              ))}
            </ul>
          )}
          <h3 className="label" style={{ marginBottom: "0.4rem" }}>
            よく検索されるキーワード
          </h3>
          {search.topQueries.length === 0 ? (
            <p className="insights-empty">まだデータがありません。</p>
          ) : (
            search.topQueries.map((q) => (
              <Bar key={q.q} label={q.q} value={q.count} total={search.topQueries[0].count} />
            ))
          )}
        </section>
      </div>

      <section className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel__head">
          <h2 className="panel__title">アウトバウンドクリック</h2>
        </div>
        {clicks.length === 0 ? (
          <p className="insights-empty">まだデータがありません。</p>
        ) : (
          clicks.map((c) => (
            <Bar key={c.href} label={c.href} value={c.clicks} total={totalClicks} />
          ))
        )}
      </section>
    </div>
  );
}
