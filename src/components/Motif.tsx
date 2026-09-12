"use client";

import { useEffect, useRef } from "react";

/**
 * The generative motif.
 *
 * The reference site drives this with a WebGL2 shader. Canvas 2D is used here
 * instead: it is a fraction of the code, runs everywhere, and at this line
 * count the visual difference is not worth the complexity.
 *
 * The one idea worth keeping from the reference is that the drawing belongs
 * to the site rather than decorating it — so its density is driven by
 * `postCount`. The more she has written, the denser the figure becomes. It is
 * the only progress indicator on the public site, and it can only grow.
 */

type Props = {
  postCount: number;
  className?: string;
};

const MIN_RINGS = 8;
const MAX_RINGS = 46;

export default function Motif({ postCount, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Density grows with the archive, easing off so it never turns to mud.
    const rings = Math.round(
      MIN_RINGS + (MAX_RINGS - MIN_RINGS) * (1 - Math.exp(-postCount / 60)),
    );

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const strokeColor = () =>
      getComputedStyle(canvas).getPropertyValue("color").trim() || "#000";

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = strokeColor();

      const cx = width * 0.5;
      const cy = height * 0.52;
      const base = Math.min(width, height) * 0.1;
      const step = (Math.min(width, height) * 0.42) / rings;

      for (let r = 0; r < rings; r++) {
        const radius = base + r * step;
        // Outer rings fade, which keeps the edge soft without a gradient.
        const fade = 0.10 + 0.5 * (1 - r / rings);
        ctx.globalAlpha = fade;
        ctx.beginPath();

        const segments = 180;
        for (let i = 0; i <= segments; i++) {
          const a = (i / segments) * Math.PI * 2;
          // Layered sines: cheap, smooth, and continuous around the loop
          // because every term is a whole multiple of the angle.
          const wobble =
            Math.sin(a * 3 + t * 0.00013 + r * 0.28) * (12 + r * 1.5) +
            Math.sin(a * 5 - t * 0.00009 + r * 0.16) * (7 + r * 0.7) +
            Math.sin(a * 2 + t * 0.00021 - r * 0.1) * (10 + r * 0.9);

          const rad = radius + wobble;
          const x = cx + Math.cos(a) * rad * 1.35;
          const y = cy + Math.sin(a) * rad * 0.82;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      draw(t);
      frameRef.current = requestAnimationFrame(loop);
    };

    resize();
    if (reduced) {
      // A single static frame — the figure still reflects the post count.
      draw(0);
    } else {
      frameRef.current = requestAnimationFrame(loop);
    }

    const onResize = () => {
      resize();
      if (reduced) draw(0);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [postCount]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      data-post-count={postCount}
      style={{ display: "block", width: "100%", height: "100%", color: "var(--ink)" }}
    />
  );
}
