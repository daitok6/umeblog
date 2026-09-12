"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorOrRedirect } from "@/lib/auth/session";
import { setCommentStatus, deleteComment } from "@/lib/repo/comments";

export async function approveCommentAction(id: number): Promise<void> {
  await requireAuthorOrRedirect();
  await setCommentStatus(id, "approved");
  revalidatePath("/admin/comments");
  revalidatePath("/");
  // The post page is where the comment actually appears.
  revalidatePath("/p/[slug]", "page");
}

export async function rejectCommentAction(id: number): Promise<void> {
  await requireAuthorOrRedirect();
  await setCommentStatus(id, "rejected");
  revalidatePath("/admin/comments");
}

export async function markSpamAction(id: number): Promise<void> {
  await requireAuthorOrRedirect();
  await setCommentStatus(id, "spam");
  revalidatePath("/admin/comments");
}

export async function deleteCommentAction(id: number): Promise<void> {
  await requireAuthorOrRedirect();
  await deleteComment(id);
  revalidatePath("/admin/comments");
}
