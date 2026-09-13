"use client";

import { useState } from "react";
import { isComposingEvent } from "@/lib/ime";
import { serializeQuestions } from "@/lib/tickets";

/**
 * Add/remove individual prompts rather than one large text blob. Serialised
 * into a single newline-joined hidden field on submit, so the server action
 * can stay a plain FormData reader.
 *
 * Enter inside a row adds a new row — guarded so confirming a Japanese
 * conversion never fires it mid-composition (see src/lib/ime.ts).
 */
export default function SuggestedQuestions({ initial }: { initial: string[] }) {
  const [questions, setQuestions] = useState<string[]>(initial.length > 0 ? initial : [""]);

  function update(i: number, value: string) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? value : q)));
  }

  function add() {
    setQuestions((qs) => (qs.length >= 8 ? qs : [...qs, ""]));
  }

  function remove(i: number) {
    setQuestions((qs) => (qs.length <= 1 ? qs : qs.filter((_, idx) => idx !== i)));
  }

  return (
    <div className="ticket-questions">
      <input type="hidden" name="suggestedQuestions" value={serializeQuestions(questions)} />
      {questions.map((q, i) => (
        <div key={i} className="ticket-questions__row">
          <label className="visually-hidden" htmlFor={`sq-${i}`}>
            聞いてみたいこと {i + 1}
          </label>
          <input
            id={`sq-${i}`}
            value={q}
            maxLength={120}
            placeholder="例：何に驚いた？"
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => {
              if (isComposingEvent(e)) return;
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <button
            type="button"
            className="btn-sm ticket-questions__remove"
            onClick={() => remove(i)}
            disabled={questions.length <= 1}
            aria-label={`聞いてみたいこと ${i + 1} を削除`}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn-sm" onClick={add} disabled={questions.length >= 8}>
        質問を追加
      </button>
    </div>
  );
}
