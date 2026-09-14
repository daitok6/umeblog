"use client";

import { useId, useState } from "react";
import { uploadImage, uploadImageRow } from "@/lib/upload-client";

type Props = {
  name: string;
  label: string;
  defaultValue: string;
  /** Shown under the field, e.g. "空欄のときは..." */
  hint?: string;
  /**
   * When given, the field also reports the uploaded image's row id (not just
   * its URL) — for callers that need to store `coverImageId`, not just render
   * a picture. The hidden input still carries the URL either way, so a plain
   * `<form action={...}>` reading `formData.get(name)` keeps working.
   */
  onPick?: (value: { url: string; id: number } | null) => void;
};

/**
 * A single image upload field for a plain `<form action={...}>` (the
 * settings page's server action reads `formData.get(name)`, so the actual
 * value lives in a hidden input rather than component state alone).
 */
export default function ImageField({ name, label, defaultValue, hint, onPick }: Props) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      if (onPick) {
        const row = await uploadImageRow(file);
        setUrl(row.url);
        onPick(row);
      } else {
        setUrl(await uploadImage(file));
      }
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setUrl("");
    onPick?.(null);
  }

  return (
    <div className="image-field">
      <label className="label" htmlFor={inputId}>
        {label}
      </label>
      <input type="hidden" name={name} value={url} />
      <div className="image-field__row">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary Blob URL, not a static asset
          <img className="image-field__preview" src={url} alt="" />
        )}
        <div className="image-field__actions">
          <label className="btn-sm image-field__upload">
            {uploading ? "アップロード中…" : url ? "差し替える" : "画像を選ぶ"}
            <input
              id={inputId}
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {url && (
            <button type="button" className="btn-sm" disabled={uploading} onClick={clear}>
              クリア
            </button>
          )}
        </div>
      </div>
      {error && <p className="image-field__error">{error}</p>}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
