import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ArticleAside from "@/components/ArticleAside";
import ArticleToc from "@/components/ArticleToc";
import BlockRenderer from "@/components/BlockRenderer";
import CommentForm from "@/components/CommentForm";
import ReadTracker from "@/components/ReadTracker";
import ReadingProgress from "@/components/ReadingProgress";
import RelatedList from "@/components/RelatedList";
import RevealScope from "@/components/RevealScope";
import { formatDate } from "@/lib/formatDate";
import { getPublishedBySlug, listPublished, listRelated } from "@/lib/repo/posts";
import { listForPost } from "@/lib/repo/replies";
import { listApproved } from "@/lib/repo/comments";
import { listWithCounts } from "@/lib/repo/tags";
import { excerptFromBlocks, headingsFromBlocks } from "@/lib/blocks";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBySlug(slug);
  if (!post) return {};

  const title = post.title || "無題";
  const description = post.lead || excerptFromBlocks(post.contentJson) || undefined;
  const images = post.cover?.url ? [post.cover.url] : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      tags: post.tags.map((t) => t.name),
      images,
      url: `/p/${post.slug}`,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
    alternates: { canonical: `/p/${post.slug}` },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBySlug(slug);
  if (!post) notFound();

  const [replies, comments, related, recentRaw, allTags] = await Promise.all([
    listForPost(post.id),
    listApproved(post.id),
    listRelated(post.id, 4),
    listPublished(8),
    listWithCounts(),
  ]);

  const headings = headingsFromBlocks(post.contentJson);

  // 話題 excludes this post's own tags — they're already shown in
  // .article__meta above, so repeating them in the sidebar would be noise.
  const postTagIds = new Set(post.tags.map((t) => t.id));
  const sideTags = allTags.filter((t) => !postTagIds.has(t.id)).slice(0, 10);

  // 最近の記事 excludes this post and anything already surfaced as 関連記事.
  const relatedIds = new Set(related.map((p) => p.id));
  const recent = recentRaw.filter((p) => p.id !== post.id && !relatedIds.has(p.id)).slice(0, 5);

  return (
    <article className="container article">
      <ReadTracker slug={post.slug} />
      <ReadingProgress />
      <RevealScope root=".article" />
      <div className="article__head" data-reveal>
        <span className="article__serial serial">
          {post.serial != null ? String(post.serial).padStart(3, "0") : ""}
        </span>
        <h1 className="article__title">{post.title || "無題"}</h1>
      </div>

      {post.lead ? (
        <p className="article__lead" data-reveal>
          {post.lead}
        </p>
      ) : null}

      <div className="article__meta" data-reveal>
        <span className="label">{formatDate(post.publishedAt)}</span>
        {post.tags.map((t) => (
          <Link key={t.id} className="label" href={`/tag/${t.slug}`}>
            {t.name}
          </Link>
        ))}
        {post.isTiny ? <span className="label">一枚</span> : null}
      </div>

      <div className="article__body">
        <ArticleToc headings={headings} variant="mobile" />

        <div className="prose" data-reveal>
          <BlockRenderer json={post.contentJson} />
        </div>

        {replies.length > 0 ? (
          <section className="replies" data-reveal>
            <h2 className="label">往復</h2>
            {replies.map((r) => (
              <div key={r.id} className="reply">
                <span className="reply__who label">{r.authorName}</span>
                <p className="reply__body">{r.body}</p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="comments" data-reveal>
          <h2 className="label">コメント（{comments.length}）</h2>
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <span className="comment__who label">{c.authorName}</span>
              <p>{c.body}</p>
            </div>
          ))}
          <CommentForm postId={post.id} />
        </section>

        <RelatedList posts={related} headingId="related-tail-heading" className="related-tail" />
      </div>

      <ArticleAside headings={headings} related={related} recent={recent} tags={sideTags} />
    </article>
  );
}
