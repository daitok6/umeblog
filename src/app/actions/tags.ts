"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorOrRedirect } from "@/lib/auth/session";
import { setChips, deleteIfUnused } from "@/lib/repo/tags";

/**
 * Saves the whole curated chip set in one submit: which tags are picked, and
 * in what order (a "表示順" number field per row — see /admin/tags). Blank or
 * duplicate order values just settle by whichever order the form happened to
 * list them in (`Array.sort` is stable), so slightly sloppy input never
 * produces a confusing result.
 */
export async function saveTagChipsAction(formData: FormData): Promise<void> {
  await requireAuthorOrRedirect();

  const picked = formData.getAll("chip").map(String);
  const ordered = picked
    .map((slug, i) => ({
      slug,
      // A missing/non-numeric order falls to the back rather than erroring.
      n: Number(formData.get(`order-${slug}`)) || Number.MAX_SAFE_INTEGER,
      i,
    }))
    .sort((a, b) => a.n - b.n || a.i - b.i)
    // Same cap as setPostTags: keeps the chip row to a readable single band.
    .slice(0, 8)
    .map((x) => x.slug);

  await setChips(ordered);

  // The chip row and the footer nav both live under the public layout, so a
  // page-scoped revalidate wouldn't reach the footer.
  revalidatePath("/", "layout");
  revalidatePath("/admin/tags");
}

/**
 * Permanently deletes one tag. `deleteIfUnused` silently no-ops if the tag
 * still has any posts or tickets attached — that guard is what makes this
 * button safe to expose without a confirmation dialog.
 *
 * Bound to a specific slug via `.bind(null, t.slug)` on each row's delete
 * button, per Next's "passing extra arguments to a form action" pattern —
 * NOT a custom `name`/`value` on the button, which would collide with the
 * hidden field Next itself uses to route a `formAction` that differs from
 * its enclosing `<form>`'s own action (this form's is `saveTagChipsAction`).
 */
export async function deleteTagAction(slug: string, _formData: FormData): Promise<void> {
  await requireAuthorOrRedirect();
  if (!slug) return;
  await deleteIfUnused(slug);
  revalidatePath("/", "layout");
  revalidatePath("/admin/tags");
}
