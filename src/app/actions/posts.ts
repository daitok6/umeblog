"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthor, requireAuthorOrRedirect, requireUserOrRedirect } from "@/lib/auth/session";
import * as postsRepo from "@/lib/repo/posts";
import { setPostTags, slugify } from "@/lib/repo/tags";
import { addReply } from "@/lib/repo/replies";
import { markPublishedForPost } from "@/lib/repo/tickets";

export async function createPostAction(isTiny: boolean): Promise<never> {
  const user = await requireAuthorOrRedirect();
  const id = await postsRepo.createDraft(user.id, isTiny);
  redirect(`/admin/posts/${id}`);
}

export type SaveResult = { ok: boolean; savedAt: number; error?: string };

/**
 * Autosave target. Kept deliberately small and idempotent — it is called
 * every few seconds while she types.
 */
export async function savePostAction(input: {
  id: number;
  title: string;
  lead: string;
  contentJson: string;
  tags: string[];
  kind: "photo" | "graphic" | "drawing";
}): Promise<SaveResult> {
  try {
    await requireAuthor();
    await postsRepo.updatePost(input.id, {
      title: input.title,
      lead: input.lead,
      contentJson: input.contentJson,
      kind: input.kind,
    });
    await setPostTags(input.id, input.tags);
    return { ok: true, savedAt: Date.now() };
  } catch (e) {
    return { ok: false, savedAt: 0, error: e instanceof Error ? e.message : "save failed" };
  }
}

/** Slugs are only fixed at publish time, so the title can change freely while drafting. */
async function ensureSlug(id: number, title: string) {
  const post = await postsRepo.getById(id);
  if (!post) return;
  if (!post.slug.startsWith("d-")) return;
  const base = slugify(title || "post") || "post";
  await postsRepo.updatePost(id, { slug: `${post.serial ?? Date.now().toString(36)}-${base}` });
}

export async function publishAction(id: number): Promise<void> {
  await requireAuthorOrRedirect();
  const post = await postsRepo.getById(id);
  await postsRepo.publishPost(id);
  await ensureSlug(id, post?.title ?? "");
  await markPublishedForPost(id);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/tickets");
  revalidatePath("/p/[slug]", "page");
  redirect("/admin/posts");
}

export async function scheduleAction(id: number, whenIso: string): Promise<void> {
  await requireAuthorOrRedirect();
  const when = new Date(whenIso).getTime();
  if (!Number.isFinite(when)) return;
  const post = await postsRepo.getById(id);
  await postsRepo.schedulePost(id, when);
  await ensureSlug(id, post?.title ?? "");
  revalidatePath("/admin");
  revalidatePath("/p/[slug]", "page");
  redirect("/admin/posts");
}

export async function submitForReviewAction(id: number): Promise<void> {
  await requireAuthorOrRedirect();
  await postsRepo.setStatus(id, "in_review");
  revalidatePath("/admin");
  redirect("/admin/posts");
}

export async function backToDraftAction(id: number): Promise<void> {
  await requireAuthorOrRedirect();
  await postsRepo.setStatus(id, "draft");
  revalidatePath("/admin");
}

/** One action, always available. Being able to undo publishing makes publishing easier. */
export async function unpublishAction(id: number): Promise<void> {
  await requireAuthorOrRedirect();
  await postsRepo.unpublish(id);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/p/[slug]", "page");
}

export async function deletePostAction(id: number): Promise<void> {
  await requireAuthorOrRedirect();
  await postsRepo.deletePost(id);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/p/[slug]", "page");
  redirect("/admin/posts");
}

/** Thumbnail picker in the editor sidebar. `null` clears it back to a text-only card. */
export async function setCoverAction(id: number, imageId: number | null): Promise<void> {
  await requireAuthor();
  if (imageId != null && !Number.isInteger(imageId)) return;
  await postsRepo.updatePost(id, { coverImageId: imageId });
  revalidatePath("/");
  revalidatePath("/admin/posts");
  revalidatePath("/p/[slug]", "page");
}

/** The home page's 注目 rail: author-flagged, published, newest first — no ranking. */
export async function setFeaturedAction(id: number, on: boolean): Promise<void> {
  await requireAuthor();
  await postsRepo.updatePost(id, { featured: on });
  revalidatePath("/");
  revalidatePath("/admin/posts");
}

/** 返事 — any signed-in trusted reader may answer a post. */
export async function addReplyAction(postId: number, body: string): Promise<void> {
  const user = await requireUserOrRedirect();
  const text = body.trim();
  if (!text) return;
  await addReply(postId, user.id, text);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/p/[slug]", "page");
}
