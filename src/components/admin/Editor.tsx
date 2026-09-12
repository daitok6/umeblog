"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { BlockNoteSchema, defaultBlockSpecs, filterSuggestionItems } from "@blocknote/core";
import type { PartialBlock } from "@blocknote/core";
// Japanese editor chrome — she should never be reading English menus.
import { ja } from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { upload } from "@vercel/blob/client";
import { isComposingEvent } from "@/lib/ime";
import { savePostAction } from "@/app/actions/posts";
import { AffiliateLinkBlock } from "@/components/admin/blocks/AffiliateLinkBlock";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    affiliateLink: AffiliateLinkBlock,
  },
});

type Props = {
  postId: number;
  initialTitle: string;
  initialLead: string;
  initialContent: string;
  initialTags: string[];
  initialHint?: string;
};

const AUTOSAVE_MS = 2500;

export default function Editor({
  postId,
  initialTitle,
  initialLead,
  initialContent,
  initialTags,
  initialHint,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [lead, setLead] = useState(initialLead || initialHint || "");
  const [tagText, setTagText] = useState(initialTags.join(" "));
  const [simple, setSimple] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  /**
   * Composition state for the WHOLE editor surface.
   *
   * Autosave must never fire mid-変換: serialising the document while a
   * composition is open can commit a half-converted string, and any resulting
   * re-render moves the selection, which cancels the composition outright.
   */
  const composingRef = useRef(false);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const initialBlocks = useMemo<PartialBlock[] | undefined>(() => {
    try {
      const parsed = JSON.parse(initialContent);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as PartialBlock[];
    } catch {
      /* fall through to the editor's own default */
    }
    return undefined;
  }, [initialContent]);

  const uploadFile = useCallback(async (file: File) => {
    // The original goes straight to Blob storage from the browser, so a
    // large phone photo never has to fit inside this app's own request-body
    // limit. The server then pulls it back down to run it through sharp.
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
    const json = (await res.json()) as { url: string };
    return json.url;
  }, []);

  const editor = useCreateBlockNote({
    schema,
    initialContent: initialBlocks,
    uploadFile,
    dictionary: ja,
  });

  const insertAffiliateLink = useCallback(() => {
    const cursor = editor.getTextCursorPosition();
    const [inserted] = editor.insertBlocks(
      [{ type: "affiliateLink" }],
      cursor.block,
      "after",
    );
    editor.setTextCursorPosition(inserted, "end");
  }, [editor]);

  const save = useCallback(async () => {
    if (composingRef.current) {
      // Try again after the composition ends rather than dropping the save.
      dirtyRef.current = true;
      return;
    }
    setSaveState("saving");
    const tags = tagText
      .split(/[\s、,]+/)
      .map((t) => t.replace(/^#/, "").trim())
      .filter(Boolean);

    const result = await savePostAction({
      id: postId,
      title,
      lead,
      contentJson: JSON.stringify(editor.document),
      tags,
    });

    if (result.ok) {
      dirtyRef.current = false;
      setSavedAt(result.savedAt);
      setSaveState("saved");
    } else {
      setSaveState("error");
    }
  }, [editor, lead, postId, tagText, title]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save();
    }, AUTOSAVE_MS);
  }, [save]);

  /**
   * For the manual "いま保存" button. A plain `save()` call leaves any
   * already-armed debounce timer running — that timer's closure still holds
   * whatever field values existed when IT was scheduled, so once it fires it
   * can silently overwrite a just-saved edit with stale data (most visibly:
   * type a title, save immediately, and an untouched earlier timer wipes the
   * title back out a couple of seconds later). Clearing the timer first
   * removes that stale write entirely.
   */
  const flushSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void save();
  }, [save]);

  /**
   * Composition tracking is attached to the wrapper and relies on bubbling, so
   * it covers the title and lead inputs as well as every block in the editor.
   */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onStart = () => {
      composingRef.current = true;
    };
    const onEnd = () => {
      composingRef.current = false;
      // A conversion just completed — that is a natural point to persist.
      if (dirtyRef.current) scheduleSave();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      // Belt and braces: if anything upstream mishandles the confirming Enter,
      // at least nothing of ours reacts to it.
      if (isComposingEvent(e)) e.stopPropagation();
    };

    el.addEventListener("compositionstart", onStart);
    el.addEventListener("compositionend", onEnd);
    el.addEventListener("keydown", onKeyDown, true);
    return () => {
      el.removeEventListener("compositionstart", onStart);
      el.removeEventListener("compositionend", onEnd);
      el.removeEventListener("keydown", onKeyDown, true);
    };
  }, [scheduleSave]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const stateLabel =
    saveState === "saving"
      ? "保存中…"
      : saveState === "error"
        ? "保存できませんでした"
        : savedAt
          ? `保存しました ${new Date(savedAt).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "下書き";

  return (
    <div ref={wrapRef} className="editor-main" data-testid="editor-root">
      <div className="editor-fields">
        <input
          className="editor-title-input"
          data-testid="title-input"
          placeholder="タイトル"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave();
          }}
        />
        <input
          className="editor-lead-input"
          data-testid="lead-input"
          placeholder="リード文（この記事で何の話をするか、一行で）"
          value={lead}
          onChange={(e) => {
            setLead(e.target.value);
            scheduleSave();
          }}
        />
      </div>

      <div className="editor-fields" style={{ paddingTop: "0.8rem", paddingBottom: "0.8rem" }}>
        <label className="label" htmlFor="tags">
          タグ（スペース区切り）
        </label>
        <input
          id="tags"
          data-testid="tags-input"
          placeholder="日々 ごはん"
          value={tagText}
          onChange={(e) => {
            setTagText(e.target.value);
            scheduleSave();
          }}
        />
      </div>

      <div className={`editor-body${simple ? " editor-body--simple" : ""}`}>
        <BlockNoteView
          editor={editor}
          theme="light"
          onChange={scheduleSave}
          data-testid="blocknote"
          slashMenu={false}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(
                [
                  ...getDefaultReactSlashMenuItems(editor),
                  {
                    title: "アフィリエイトリンク",
                    subtext: "商品カードを挿入（PR表記つき）",
                    aliases: ["affiliate", "アフィリエイト", "pr"],
                    group: "メディア",
                    onItemClick: insertAffiliateLink,
                  },
                ],
                query,
              )
            }
          />
        </BlockNoteView>
      </div>

      <div
        className="editor-fields"
        style={{ borderBottom: 0, borderTop: "1px solid var(--rule)", flexDirection: "row", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
      >
        <label className="simple-toggle">
          <input
            type="checkbox"
            checked={simple}
            onChange={(e) => setSimple(e.target.checked)}
            data-testid="simple-mode"
          />
          シンプルモード
        </label>
        <button className="btn-sm" type="button" onClick={insertAffiliateLink} data-testid="insert-affiliate">
          ＋ アフィリエイト
        </button>
        <span style={{ flex: 1 }} />
        <span className="save-state" data-testid="save-state">
          {stateLabel}
        </span>
        <button className="btn-sm" type="button" onClick={() => flushSave()}>
          いま保存
        </button>
      </div>
    </div>
  );
}
