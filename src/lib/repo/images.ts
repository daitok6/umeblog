import { db, schema } from "@/lib/db";
import { putImage } from "@/lib/storage";

export async function saveUpload(buf: Buffer, originalName: string, alt = ""): Promise<schema.ImageRow> {
  const stored = await putImage(buf, originalName);
  const [row] = await db
    .insert(schema.images)
    .values({ ...stored, alt, createdAt: Date.now() })
    .returning();
  return row;
}
