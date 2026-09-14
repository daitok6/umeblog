"use client";

import { useId, useState } from "react";
import { uploadImage } from "@/lib/upload-client";

type Props = {
  name: string;
  label: string;
  defaultValue: string;
  /** Shown under the field, e.g. "空欄のときは..." */
  hint?: string;
};

/**
 * A single image upload field for a plain `<form action={...}>` (the
 * settings page's server action reads `formData.get(name)`, so the actual
 * value lives in a hidden input rather than component state alone).
 */
export default function ImageField({ name, label, defaultValue, hint }: Props) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setUrl(await uploadImage(file));
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
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
            <button
              type="button"
              className="btn-sm"
              disabled={uploading}
              onClick={() => setUrl("")}
            >
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
