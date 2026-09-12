import path from "node:path";
import sharp from "sharp";
import { put, del } from "@vercel/blob";

/**
 * Storage adapter. Files live in Vercel Blob and are served directly from its
 * CDN — the app never proxies bytes. Swapping providers again means replacing
 * the three functions below; nothing else in the app touches storage.
 */

const PREFIX = "uploads/";

/** Phone photos are routinely 3–5MB; every upload is re-encoded before it lands. */
const MAX_EDGE = 2000;
const QUALITY = 82;

export type StoredImage = {
  /** Blob pathname, used later to delete the object. */
  filename: string;
  /** Public CDN URL — this is what gets stored on the post/image row and rendered. */
  url: string;
  width: number;
  height: number;
  mime: string;
  size: number;
};

export async function putImage(buf: Buffer, originalName: string): Promise<StoredImage> {
  const pipeline = sharp(buf).rotate().resize({
    width: MAX_EDGE,
    height: MAX_EDGE,
    fit: "inside",
    withoutEnlargement: true,
  });

  const out = await pipeline.webp({ quality: QUALITY }).toBuffer({ resolveWithObject: true });

  const base = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, "") || "image";
  const pathname = `${PREFIX}${Date.now()}-${base}.webp`;

  const blob = await put(pathname, out.data, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
  });

  return {
    filename: blob.pathname,
    url: blob.url,
    width: out.info.width,
    height: out.info.height,
    mime: "image/webp",
    size: out.data.byteLength,
  };
}

export async function deleteImage(filename: string): Promise<void> {
  await del(filename).catch(() => {});
}
