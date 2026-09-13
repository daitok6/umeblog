import type { Metadata } from "next";
import BlogBrowser from "@/components/BlogBrowser";
import { listPublished } from "@/lib/repo/posts";

export const revalidate = 300;
export const metadata: Metadata = { title: "Blog" };

export default async function BlogPage() {
  // A blog this size fits comfortably in one request; past a few hundred
  // posts this should move to server-side filtering with URL params instead.
  const raw = await listPublished(1000);

  // BlogBrowser is a client component, so every field here is serialized to
  // the browser. `contentJson` is the raw BlockNote body — multiple KB per
  // post — and BlogBrowser's instant search never reads it (see its module
  // comment), so it's stripped at this boundary rather than shipped and
  // ignored. Full body search stays server-side at `/search`.
  const posts = raw.map((p) => ({ ...p, contentJson: "" }));

  return (
    <>
      <section className="blog-hero">
        <div className="blog-hero__motifs" aria-hidden="true">
          <span className="blog-hero__motif blog-hero__motif--plant" />
          <span className="blog-hero__motif blog-hero__motif--globe blog-hero__motif--extra" />
          <span className="blog-hero__motif blog-hero__motif--plane" />
          <span className="blog-hero__motif blog-hero__motif--cup blog-hero__motif--extra" />
          <span className="blog-hero__motif blog-hero__motif--mascot" />
        </div>
        <div className="container blog-hero__inner">
          <div className="blog-hero__copy">
            <p className="blog-hero__tagline">ちょっとレトロ、ちょっと旅、ちょっとヘン。</p>
            <h1 className="blog-hero__title">Blog</h1>
            <span className="blog-hero__kana">ブログ</span>
          </div>
        </div>
      </section>
      <div className="container">
        <BlogBrowser posts={posts} />
      </div>
    </>
  );
}
