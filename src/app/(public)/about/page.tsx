import type { Metadata } from "next";
import { getSettings } from "@/lib/repo/settings";
import { getStats } from "@/lib/repo/stats";

export const revalidate = 300;
export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const [settings, stats] = await Promise.all([getSettings(), getStats()]);

  return (
    <div className="container">
      <div className="section-title">
        <h2>About</h2>
        <span className="kana-sub">このブログについて</span>
      </div>
      <div className="prose" style={{ paddingBottom: "4rem" }}>
        {settings.aboutMd.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        <hr className="rule" />
        <p className="label">
          これまで {stats.total} 本 ／ 往復 {stats.exchanges} 回
        </p>
      </div>
    </div>
  );
}
