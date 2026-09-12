import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

const { shortLinks } = schema;

/** Lowercase letters, digits, and hyphens only — keeps `/go/<code>` safe to hand-type or print on a QR code. */
const CODE_RE = /^[a-z0-9-]{1,40}$/;

export function isValidCode(code: string): boolean {
  return CODE_RE.test(code);
}

export async function listShortLinks(): Promise<schema.ShortLink[]> {
  return db.select().from(shortLinks).orderBy(desc(shortLinks.createdAt));
}

export async function getShortLinkByCode(code: string): Promise<schema.ShortLink | null> {
  const rows = await db.select().from(shortLinks).where(eq(shortLinks.code, code)).limit(1);
  return rows[0] ?? null;
}

export type CreateShortLinkResult = { ok: true } | { ok: false; error: string };

export async function createShortLink(input: {
  code: string;
  destination: string;
  label: string;
}): Promise<CreateShortLinkResult> {
  const code = input.code.trim().toLowerCase();
  if (!isValidCode(code)) {
    return { ok: false, error: "コードは半角英数字とハイフンのみ、40文字までです。" };
  }
  let destination: URL;
  try {
    destination = new URL(input.destination.trim());
  } catch {
    return { ok: false, error: "リンク先には有効なURLを入力してください。" };
  }
  if (destination.protocol !== "http:" && destination.protocol !== "https:") {
    return { ok: false, error: "リンク先はhttp(s)のURLのみ使えます。" };
  }

  const existing = await getShortLinkByCode(code);
  if (existing) {
    return { ok: false, error: `コード「${code}」はすでに使われています。` };
  }

  await db.insert(shortLinks).values({
    code,
    destination: destination.href,
    label: input.label.trim().slice(0, 200),
    createdAt: Date.now(),
  });
  return { ok: true };
}

export async function deleteShortLink(id: number): Promise<void> {
  await db.delete(shortLinks).where(eq(shortLinks.id, id));
}
