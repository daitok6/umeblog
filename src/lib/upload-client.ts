import { upload } from "@vercel/blob/client";

/**
 * Browser-side image upload, shared by anything in /admin that needs to turn
 * a File into a stored image URL (the block editor's drag-and-drop, the
 * settings page's hero-image fields, ...).
 *
 * The original goes straight to Blob storage from the browser, so a large
 * phone photo never has to fit inside this app's own request-body limit. The
 * server then pulls it back down to run it through sharp.
 */
export async function uploadImage(file: File): Promise<string> {
  return (await uploadImageRow(file)).url;
}

/**
 * Same upload round-trip as `uploadImage`, but keeps the stored image row's
 * id — needed wherever a caller has to reference the row itself (a post's
 * `coverImageId`), not just render the URL.
 */
export async function uploadImageRow(file: File): Promise<{ url: string; id: number }> {
  const blob = await upload(`incoming/${file.name}`, file, {
    access: "public",
    contentType: file.type,
    handleUploadUrl: "/api/upload/token",
  });

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: blob.url }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "upload failed");
  }
  return (await res.json()) as { url: string; id: number };
}
