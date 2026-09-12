/**
 * Japanese IME safety.
 *
 * Typing Japanese means composing: several keystrokes produce one character,
 * and the Enter key CONFIRMS a conversion before it ever means "new line".
 * The rule that follows is absolute:
 *
 *   Never act on a key event while a composition is in flight, and never
 *   mutate the DOM or move the selection during one.
 *
 * Breaking it produces the classic bug — a markdown shortcut such as `#` →
 * heading fires on the Enter that confirms 変換, so the block transforms
 * mid-conversion and the pending text is lost. This is exactly the open
 * defect class documented in BlockNote and Tiptap, and the person using this
 * app would hit it every single day.
 *
 * Everything in the editor path routes through these helpers, and
 * tests/ime.spec.ts holds them to it.
 */

export type ComposableEvent = {
  isComposing?: boolean;
  keyCode?: number;
  which?: number;
};

/**
 * True when the event arrived mid-composition and must be ignored.
 *
 * `keyCode === 229` is the legacy signal some browsers still send instead of
 * setting `isComposing`; both are checked because either alone leaks.
 */
export function isComposingEvent(e: ComposableEvent | null | undefined): boolean {
  if (!e) return false;
  if (e.isComposing === true) return true;
  const code = e.keyCode ?? e.which;
  return code === 229;
}

/**
 * Inverse of the above, named for how it reads at a call site:
 *   if (!shouldHandleKey(e)) return;
 */
export function shouldHandleKey(e: ComposableEvent | null | undefined): boolean {
  return !isComposingEvent(e);
}

/**
 * Wraps a keyboard handler so it is skipped during composition.
 * Use for anything that transforms content on Enter.
 */
export function guardKeyHandler<E extends ComposableEvent>(
  handler: (event: E) => void,
): (event: E) => void {
  return (event: E) => {
    if (isComposingEvent(event)) return;
    handler(event);
  };
}

/**
 * Tracks composition state for a DOM element, for cases where an event does
 * not carry `isComposing` itself (input events fired from React synthetics,
 * autosave timers, blur handlers).
 *
 * Returns a disposer.
 */
export function trackComposition(
  el: HTMLElement,
  onChange: (composing: boolean) => void,
): () => void {
  const start = () => onChange(true);
  const end = () => onChange(false);
  el.addEventListener("compositionstart", start);
  el.addEventListener("compositionend", end);
  return () => {
    el.removeEventListener("compositionstart", start);
    el.removeEventListener("compositionend", end);
  };
}
