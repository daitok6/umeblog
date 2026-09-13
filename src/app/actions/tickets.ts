"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthorOrRedirect } from "@/lib/auth/session";
import * as ticketsRepo from "@/lib/repo/tickets";
import * as postsRepo from "@/lib/repo/posts";
import * as deliverablesRepo from "@/lib/repo/deliverables";
import { setPostTags } from "@/lib/repo/tags";
import {
  parseQuestions,
  serializeQuestions,
  toPillar,
  toPriority,
  toSignalLevel,
  toStatus,
  toTopicType,
  type TicketStatus,
} from "@/lib/tickets";

export type TicketFormState = { ok: boolean; error: string };

function readTags(formData: FormData): string[] {
  const raw = String(formData.get("tags") ?? "");
  return raw.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean).slice(0, 8);
}

function parseTargetDate(raw: string): number | null {
  if (!raw) return null;
  const ms = new Date(`${raw}T00:00:00`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * One action for both create and edit, keyed on a hidden `id` field — the
 * same shape as the rest of the form is much simpler than two near-identical
 * actions.
 */
export async function saveTicketAction(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const user = await requireAuthorOrRedirect();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "タイトルを入力してください。" };
  if (title.length > 120) return { ok: false, error: "タイトルは120文字までにしてください。" };

  const description = String(formData.get("description") ?? "").trim().slice(0, 400);
  const inspirationNotes = String(formData.get("inspirationNotes") ?? "").trim().slice(0, 2000);
  const creativeIdeas = String(formData.get("creativeIdeas") ?? "").trim().slice(0, 1000);

  const questions = parseQuestions(String(formData.get("suggestedQuestions") ?? ""));
  const suggestedQuestions = serializeQuestions(questions);

  const input: ticketsRepo.TicketInput = {
    title,
    description,
    pillar: toPillar(formData.get("pillar")),
    topicType: toTopicType(formData.get("topicType")),
    priority: toPriority(formData.get("priority")),
    inspirationNotes,
    suggestedQuestions,
    creativeIdeas,
    seoPotential: toSignalLevel(formData.get("seoPotential")),
    monetizationPotential: toSignalLevel(formData.get("monetizationPotential")),
    socialPotential: toSignalLevel(formData.get("socialPotential")),
    crossPlatformPotential: toSignalLevel(formData.get("crossPlatformPotential")),
    evergreen: formData.get("evergreen") === "on",
    seasonal: formData.get("seasonal") === "on",
    targetPublishDate: parseTargetDate(String(formData.get("targetPublishDate") ?? "")),
  };

  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
  const tags = readTags(formData);

  let ticketId: number;
  if (id && Number.isFinite(id)) {
    await ticketsRepo.update(id, input);
    ticketId = id;
  } else {
    ticketId = await ticketsRepo.create(user.id, input);
  }
  await ticketsRepo.setTicketTags(ticketId, tags);

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  redirect(`/admin/tickets/${ticketId}`);
}

export async function setTicketStatusAction(id: number, status: TicketStatus): Promise<void> {
  await requireAuthorOrRedirect();
  await ticketsRepo.setStatus(id, toStatus(status));
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${id}`);
}

export async function deleteTicketAction(id: number): Promise<void> {
  await requireAuthorOrRedirect();
  await ticketsRepo.remove(id);
  revalidatePath("/admin/tickets");
  redirect("/admin/tickets");
}

/**
 * Carries the title and tags into a fresh draft — nothing else. Internal
 * planning notes (inspiration, questions, creative ideas, the three signals)
 * are deliberately left out of the public-facing post.
 *
 * Also creates (or reuses) a BLOG platform deliverable and links it to the
 * new post, so the idea's platform plan and its single `linkedPostId` stay
 * in sync — one button, one coherent model.
 */
export async function createPostFromTicketAction(id: number): Promise<void> {
  const user = await requireAuthorOrRedirect();
  const ticket = await ticketsRepo.getById(id);
  if (!ticket) redirect("/admin/tickets");

  const postId = await postsRepo.createDraft(user.id);
  await postsRepo.updatePost(postId, { title: ticket.title });
  if (ticket.tags.length > 0) {
    await setPostTags(postId, ticket.tags.map((t) => t.name));
  }
  await ticketsRepo.linkPost(id, postId);
  await ticketsRepo.setStatus(id, "in_progress");

  const existingBlog = ticket.deliverables.find((d) => d.platform === "blog" && !d.linkedPostId);
  if (existingBlog) {
    await deliverablesRepo.linkPost(existingBlog.id, postId);
    await deliverablesRepo.setStatus(existingBlog.id, "in_progress");
  } else if (!ticket.deliverables.some((d) => d.platform === "blog")) {
    const deliverableId = await deliverablesRepo.create(id, {
      platform: "blog",
      format: "",
      role: "utility",
      workingTitle: ticket.title,
      angle: "",
      notes: "",
      status: "in_progress",
      targetPublishDate: null,
      publishedUrl: "",
      metadataJson: "{}",
      sourceDeliverableId: null,
    });
    await deliverablesRepo.linkPost(deliverableId, postId);
  }

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${id}`);
  redirect(`/admin/posts/${postId}`);
}

export async function unlinkTicketAction(id: number): Promise<void> {
  await requireAuthorOrRedirect();
  await ticketsRepo.unlinkPost(id);
  revalidatePath(`/admin/tickets/${id}`);
}
