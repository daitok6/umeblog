import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function getSettings(): Promise<schema.SiteSettings> {
  const row = await db.query.siteSettings.findFirst();
  if (row) return row;
  const fallback = {
    id: 1,
    title: "うめ",
    bannerTitle: "",
    titleMobile: "",
    bannerTitleMobile: "",
    tagline: "日々を綴るブログ",
    aboutMd: "",
    railsJson: "",
  };
  await db.insert(schema.siteSettings).values(fallback).onConflictDoNothing();
  return fallback;
}

export async function updateSettings(
  patch: Partial<Omit<schema.SiteSettings, "id">>,
): Promise<void> {
  await db.update(schema.siteSettings).set(patch).where(eq(schema.siteSettings.id, 1));
}

/** Wide (default) vs narrow-viewport header wordmark. Visible UI only. */
export function bannerNames(s: schema.SiteSettings): { wide: string; narrow: string } {
  const wide = s.bannerTitle || s.title;
  return { wide, narrow: s.bannerTitleMobile || wide };
}

/** Wide (default) vs narrow-viewport site name. Visible UI only — metadata, OG and RSS keep `title`. */
export function siteNames(s: schema.SiteSettings): { wide: string; narrow: string } {
  return { wide: s.title, narrow: s.titleMobile || s.title };
}
