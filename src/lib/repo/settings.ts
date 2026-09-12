import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function getSettings(): Promise<schema.SiteSettings> {
  const row = await db.query.siteSettings.findFirst();
  if (row) return row;
  const fallback = {
    id: 1,
    title: "うめ",
    tagline: "日々を綴るブログ",
    aboutMd: "",
  };
  await db.insert(schema.siteSettings).values(fallback).onConflictDoNothing();
  return fallback;
}

export async function updateSettings(
  patch: Partial<Omit<schema.SiteSettings, "id">>,
): Promise<void> {
  await db.update(schema.siteSettings).set(patch).where(eq(schema.siteSettings.id, 1));
}
