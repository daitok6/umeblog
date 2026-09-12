import Motif from "@/components/Motif";
import PostList from "@/components/PostList";
import { listPublished } from "@/lib/repo/posts";
import { getStats } from "@/lib/repo/stats";
import { getSettings } from "@/lib/repo/settings";

export const revalidate = 300;

export default async function HomePage() {
  const [posts, stats, settings] = await Promise.all([
    listPublished(60),
    getStats(),
    getSettings(),
  ]);

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
              <h1 className="hero__title">{settings.title}</h1>
              {settings.tagline ? <p className="hero__tagline">{settings.tagline}</p> : null}
            </div>
          </div>
        </section>

        <div className="section-title">
          <h2>Blog</h2>
          <span className="kana-sub">ブログ</span>
        </div>

        <PostList posts={posts} />
      </div>
    </>
  );
}
