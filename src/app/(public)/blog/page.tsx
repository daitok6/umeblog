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
    <div className="container">
      <div className="section-title">
        <h2>Blog</h2>
        <span className="kana-sub">ブログ</span>
      </div>
      <BlogBrowser posts={posts} />
    </div>
  );
}
