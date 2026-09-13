"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthorOrRedirect } from "@/lib/auth/session";
import * as deliverablesRepo from "@/lib/repo/deliverables";
import * as ticketsRepo from "@/lib/repo/tickets";
import * as postsRepo from "@/lib/repo/posts";
import { setPostTags } from "@/lib/repo/tags";
import {
  parseMetadata,
  serializeMetadata,
  toContentRole,
  toDeliverableStatus,
  toPlatform,
  type DeliverableStatus,
} from "@/lib/deliverables";

export type DeliverableFormState = { ok: boolean; error: string };

function parseTargetDate(raw: string): number | null {
  if (!raw) return null;
  const ms = new Date(`${raw}T00:00:00`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function readMetadataFromForm(
  platform: ReturnType<typeof toPlatform>,
  formData: FormData,
): string {
  const raw: Record<string, unknown> = {};
  if (platform === "instagram") {
    raw.caption = String(formData.get("meta_caption") ?? "");
    const slideCount = Number(formData.get("meta_slideCount") ?? "");
    if (Number.isFinite(slideCount) && slideCount > 0) raw.slideCount = slideCount;
    raw.callToAction = String(formData.get("meta_callToAction") ?? "");
    raw.hashtags = String(formData.get("meta_hashtags") ?? "")
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter(Boolean);
  } else if (platform === "note") {
    raw.isPaid = formData.get("meta_isPaid") === "on";
    raw.intro = String(formData.get("meta_intro") ?? "");
  } else if (platform === "blog") {
    raw.seoTitle = String(formData.get("meta_seoTitle") ?? "");
    raw.metaDescription = String(formData.get("meta_metaDescription") ?? "");
    raw.affiliatePotential = String(formData.get("meta_affiliatePotential") ?? "");
  }
  return serializeMetadata(platform, raw);
}

/**
 * One action for create and edit, keyed on hidden `id`/`ticketId` fields —
 * same shape as saveTicketAction. Only a platform is required; every other
 * field may be left blank, so "Instagram / carousel / discovery / (blank
 * angle)" is a complete, valid submission.
 */
export async function saveDeliverableAction(
  _prev: DeliverableFormState,
  formData: FormData,
): Promise<DeliverableFormState> {
  await requireAuthorOrRedirect();

  const ticketIdRaw = formData.get("ticketId");
  const ticketId = ticketIdRaw ? Number(ticketIdRaw) : NaN;
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    return { ok: false, error: "アイデアが見つかりません。" };
  }

  const platform = toPlatform(formData.get("platform"));
  const format = String(formData.get("format") ?? "").trim().slice(0, 60);
  const role = toContentRole(formData.get("role"));
  const workingTitle = String(formData.get("workingTitle") ?? "").trim().slice(0, 120);
  const angle = String(formData.get("angle") ?? "").trim().slice(0, 300);
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000);
  const status = toDeliverableStatus(formData.get("status"));
  const targetPublishDate = parseTargetDate(String(formData.get("targetPublishDate") ?? ""));
  const metadataJson = readMetadataFromForm(platform, formData);

  const sourceRaw = formData.get("sourceDeliverableId");
  const sourceDeliverableId = sourceRaw ? Number(sourceRaw) : null;

  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;

  // Blog's publishedUrl is derived from the linked post, never entered here
  // (the field isn't even rendered for blog) — so an edit to a blog
  // deliverable must carry its existing value forward rather than blank it.
  let publishedUrl = "";
  if (platform !== "blog") {
    publishedUrl = String(formData.get("publishedUrl") ?? "").trim().slice(0, 500);
  } else if (id && Number.isFinite(id)) {
    const existing = await deliverablesRepo.getById(id);
    publishedUrl = existing?.publishedUrl ?? "";
  }

  const input: deliverablesRepo.DeliverableInput = {
    platform,
    format,
    role,
    workingTitle,
    angle,
    notes,
    status,
    targetPublishDate,
    publishedUrl,
    metadataJson,
    sourceDeliverableId:
      sourceDeliverableId && Number.isFinite(sourceDeliverableId) ? sourceDeliverableId : null,
  };

  if (id && Number.isFinite(id)) {
    await deliverablesRepo.update(id, input);
  } else {
    await deliverablesRepo.create(ticketId, input);
  }

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return { ok: true, error: "" };
}

export async function setDeliverableStatusAction(
  id: number,
  ticketId: number,
  status: DeliverableStatus,
): Promise<void> {
  await requireAuthorOrRedirect();
  await deliverablesRepo.setStatus(id, toDeliverableStatus(status));
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
}

export async function deleteDeliverableAction(id: number, ticketId: number): Promise<void> {
  await requireAuthorOrRedirect();
  await deliverablesRepo.remove(id);
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
}

/**
 * The BLOG deliverable's "create blog draft" action. Carries only the
 * working title (falling back to the ticket's own title) and the ticket's
 * tags into a fresh post — inspiration notes, suggested questions, and the
 * SEO/monetization signals stay internal, exactly like
 * createPostFromTicketAction.
 */
export async function createPostFromDeliverableAction(id: number): Promise<void> {
  const user = await requireAuthorOrRedirect();
  const deliverable = await deliverablesRepo.getById(id);
  if (!deliverable) return;

  const ticket = await ticketsRepo.getById(deliverable.ticketId);
  if (!ticket) return;

  const title = deliverable.workingTitle || ticket.title;
  const postId = await postsRepo.createDraft(user.id);
  await postsRepo.updatePost(postId, { title });
  if (ticket.tags.length > 0) {
    await setPostTags(postId, ticket.tags.map((t) => t.name));
  }

  await deliverablesRepo.linkPost(id, postId);
  await deliverablesRepo.setStatus(id, "in_progress");

  // Keep the ticket's own single-post link populated too, so the post
  // editor's existing "もとのアイデア" back-link keeps working unchanged.
  if (!ticket.linkedPostId) {
    await ticketsRepo.linkPost(ticket.id, postId);
    await ticketsRepo.setStatus(ticket.id, "in_progress");
  }

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticket.id}`);
  redirect(`/admin/posts/${postId}`);
}

/** Manual publish record for instagram/note deliverables. */
export async function setDeliverablePublishedAction(
  id: number,
  ticketId: number,
  url: string,
  dateIso: string,
): Promise<void> {
  await requireAuthorOrRedirect();
  const at = dateIso ? parseTargetDate(dateIso) : null;
  await deliverablesRepo.setPublished(id, url.trim().slice(0, 500), at);
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
}
