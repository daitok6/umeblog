"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorOrRedirect } from "@/lib/auth/session";
import { createShortLink, deleteShortLink } from "@/lib/repo/shortLinks";

export type ShortLinkFormState = { ok: boolean; message: string };

export async function createShortLinkAction(
  _prev: ShortLinkFormState,
  formData: FormData,
): Promise<ShortLinkFormState> {
  await requireAuthorOrRedirect();

  const result = await createShortLink({
    code: String(formData.get("code") ?? ""),
    destination: String(formData.get("destination") ?? ""),
    label: String(formData.get("label") ?? ""),
  });
  if (!result.ok) return { ok: false, message: result.error };

  revalidatePath("/admin/insights/links");
  return { ok: true, message: "作成しました。" };
}

export async function deleteShortLinkAction(formData: FormData): Promise<void> {
  await requireAuthorOrRedirect();
  const id = Number(formData.get("id"));
  if (Number.isFinite(id)) await deleteShortLink(id);
  revalidatePath("/admin/insights/links");
}
