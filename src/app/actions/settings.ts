"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorOrRedirect } from "@/lib/auth/session";
import { updateSettings } from "@/lib/repo/settings";

export async function saveSettingsAction(formData: FormData): Promise<void> {
  await requireAuthorOrRedirect();
  await updateSettings({
    title: String(formData.get("title") ?? "").slice(0, 60) || "うめ",
    // Empty means "inherit `title`" for the header wordmark, so no fallback here.
    bannerTitle: String(formData.get("bannerTitle") ?? "").slice(0, 60),
    // Same inherit-when-empty convention, one level down: mobile falls back
    // to the resolved desktop value, not directly to a hardcoded default.
    titleMobile: String(formData.get("titleMobile") ?? "").slice(0, 60),
    bannerTitleMobile: String(formData.get("bannerTitleMobile") ?? "").slice(0, 60),
    tagline: String(formData.get("tagline") ?? "").slice(0, 120),
    aboutMd: String(formData.get("aboutMd") ?? "").slice(0, 4000),
  });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/about");
}
