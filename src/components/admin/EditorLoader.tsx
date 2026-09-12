"use client";

import dynamic from "next/dynamic";

/**
 * BlockNote touches `window` while constructing the editor, so it must not be
 * server-rendered at all — marking it "use client" is not sufficient, because
 * Next still renders client components on the server for the initial HTML.
 * This is the documented Next.js caveat for BlockNote.
 */
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div className="editor-main">
      <div className="editor-fields">
        <p className="label">エディタを読み込んでいます…</p>
      </div>
    </div>
  ),
});

export default Editor;
