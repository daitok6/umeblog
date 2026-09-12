import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import ResponsiveName from "@/components/ResponsiveName";
import { getSettings, bannerNames, siteNames } from "@/lib/repo/settings";
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
  const banner = bannerNames(settings);
  const site = siteNames(settings);

  return (
    <div className="public-shell">
      <SiteHeader wide={banner.wide} narrow={banner.narrow} />
      <main>{children}</main>
      <footer className="site-footer">
        <div className="container site-footer__inner">
          <span className="label">
            {kou.sekki} {kou.phase} — {kou.name}（{kou.reading}）
          </span>
          <span className="label">
            <ResponsiveName wide={site.wide} narrow={site.narrow} />
          </span>
        </div>
      </footer>
    </div>
  );
}
