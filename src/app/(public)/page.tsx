import Link from "next/link";
import Motif from "@/components/Motif";
import PostRail from "@/components/PostRail";
import ResponsiveName from "@/components/ResponsiveName";
import { loadRail } from "@/lib/repo/posts";
import { getStats } from "@/lib/repo/stats";
import { getSettings, siteNames } from "@/lib/repo/settings";
import { parseRails, railTitle } from "@/lib/rails";

export const revalidate = 300;

export default async function HomePage() {
  const [stats, settings] = await Promise.all([getStats(), getSettings()]);
  const site = siteNames(settings);
  const railConfigs = parseRails(settings.railsJson);
  const rails = await Promise.all(
    railConfigs.map(async (cfg) => ({ cfg, posts: await loadRail(cfg) })),
  );

  return (
    <>
      <div className="container">
        {/* The framed block — the reference's signature, 1px inset from the gutter. */}
        <section className="hero frame">
          <div className="hero__motif">
            <Motif postCount={stats.total} />
          </div>
          <div className="hero__body">
            <div>
              <h1 className="hero__title">
                <ResponsiveName wide={site.wide} narrow={site.narrow} />
              </h1>
              {settings.tagline ? <p className="hero__tagline">{settings.tagline}</p> : null}
            </div>
          </div>
        </section>

        {rails.map(
          ({ cfg, posts }, i) =>
            posts.length > 0 && <PostRail key={i} title={railTitle(cfg)} posts={posts} />,
        )}

        <p className="rail-more">
          <Link href="/blog">すべての記事 →</Link>
        </p>
      </div>
    </>
  );
}
