import type { Metadata } from "next";
import Link from "next/link";
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
          <div className="site-footer__brand">
            <span className="site-footer__logo">
              <ResponsiveName wide={site.wide} narrow={site.narrow} />
            </span>
            {settings.tagline ? <p className="site-footer__tagline">{settings.tagline}</p> : null}
          </div>
          <nav className="site-footer__nav">
            <Link href="/blog">Blog</Link>
            <Link href="/about">About</Link>
          </nav>
          <div className="site-footer__meta">
            <span className="site-footer__sekki">
              {kou.sekki} {kou.phase} — {kou.name}（{kou.reading}）
            </span>
            <span className="site-footer__copyright">
              © {new Date().getFullYear()} <ResponsiveName wide={site.wide} narrow={site.narrow} />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
