import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import BlockRenderer from "@/components/BlockRenderer";
import CommentForm from "@/components/CommentForm";
import { formatDate } from "@/components/PostList";
import { getPublishedBySlug } from "@/lib/repo/posts";
import { listForPost } from "@/lib/repo/replies";
import { listApproved } from "@/lib/repo/comments";
import { excerptFromBlocks } from "@/lib/blocks";

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

  const [replies, comments] = await Promise.all([
    listForPost(post.id),
    listApproved(post.id),
  ]);

  return (
    <article className="container article">
      <div className="article__head">
        <span className="article__serial serial">
          {post.serial != null ? String(post.serial).padStart(3, "0") : ""}
        </span>
        <h1 className="article__title">{post.title || "無題"}</h1>
      </div>

      {post.lead ? <p className="article__lead">{post.lead}</p> : null}

      <div className="article__meta">
        <span className="label">{formatDate(post.publishedAt)}</span>
        {post.tags.map((t) => (
          <Link key={t.id} className="label" href={`/tag/${t.slug}`}>
            {t.name}
          </Link>
        ))}
        {post.isTiny ? <span className="label">一枚</span> : null}
      </div>

      <div className="prose">
        <BlockRenderer json={post.contentJson} />
      </div>

      {replies.length > 0 ? (
        <section className="replies">
          <h2 className="label">往復</h2>
          {replies.map((r) => (
            <div key={r.id} className="reply">
              <span className="reply__who label">{r.authorName}</span>
              <p className="reply__body">{r.body}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="comments">
        <h2 className="label">コメント（{comments.length}）</h2>
        {comments.map((c) => (
          <div key={c.id} className="comment">
            <span className="comment__who label">{c.authorName}</span>
            <p>{c.body}</p>
          </div>
        ))}
        <CommentForm postId={post.id} />
      </section>
    </article>
  );
}
