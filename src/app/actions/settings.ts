"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorOrRedirect } from "@/lib/auth/session";
import { updateSettings } from "@/lib/repo/settings";

/** Same host next.config.ts allowlists for next/image, re-checked in /api/upload. */
const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/;

/**
 * These reach next/image as a `src`, so a bad value would break the home
 * page rather than just looking wrong — accept only what the upload flow can
 * actually produce (an absolute Blob URL) or a same-origin path, empty
 * otherwise.
 */
function sanitizeImageUrl(raw: FormDataEntryValue | null): string {
  const value = String(raw ?? "");
  if (!value) return "";
  if (value.startsWith("/")) return value.slice(0, 2000);
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" && BLOB_HOST.test(parsed.hostname)) {
      return value.slice(0, 2000);
    }
  } catch {
    /* not a URL at all */
  }
  return "";
}

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
    heroImageUrl: sanitizeImageUrl(formData.get("heroImageUrl")),
    heroImageMobileUrl: sanitizeImageUrl(formData.get("heroImageMobileUrl")),
    aboutMd: String(formData.get("aboutMd") ?? "").slice(0, 4000),
  });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/about");
}
