import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { getSettings } from "@/lib/repo/settings";
import { kouFor } from "@/lib/sekki";
import "./public.css";

export const metadata: Metadata = {
  alternates: {
    types: { "application/rss+xml": "/feed.xml" },
  },
};

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const kou = kouFor();

  return (
    <div className="public-shell">
      <SiteHeader title={settings.title} />
      <main>{children}</main>
      <footer className="site-footer">
        <div className="container site-footer__inner">
          <span className="label">
            {kou.sekki} {kou.phase} — {kou.name}（{kou.reading}）
          </span>
          <span className="label">{settings.title}</span>
        </div>
      </footer>
    </div>
  );
}
