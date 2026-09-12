"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorOrRedirect } from "@/lib/auth/session";
import { updateSettings } from "@/lib/repo/settings";

export async function saveSettingsAction(formData: FormData): Promise<void> {
  await requireAuthorOrRedirect();
  await updateSettings({
    title: String(formData.get("title") ?? "").slice(0, 60) || "うめ",
    tagline: String(formData.get("tagline") ?? "").slice(0, 120),
    aboutMd: String(formData.get("aboutMd") ?? "").slice(0, 4000),
  });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/about");
}
