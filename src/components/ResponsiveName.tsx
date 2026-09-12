/**
 * Renders both the wide- and narrow-viewport variants of a name and lets CSS
 * pick which one shows (see `.rname--wide` / `.rname--narrow` in public.css).
 * A CSS swap means no client component, no hydration flash, and no guessing
 * the viewport on the server.
 */
export default function ResponsiveName({ wide, narrow }: { wide: string; narrow: string }) {
  if (wide === narrow) return <>{wide}</>;
  return (
    <>
      <span className="rname--wide">{wide}</span>
      <span className="rname--narrow">{narrow}</span>
    </>
  );
}
