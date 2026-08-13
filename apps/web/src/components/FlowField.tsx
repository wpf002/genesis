'use client';

import { useEffect, useRef } from 'react';
import { decorativeRng } from '@/lib/decorative-prng';

// Decorative advection field. Ornament, not simulation output, and captioned as
// such in the hero. Draws from the decorative PRNG, never the kernel stream.
// Seeded so it renders identically on every load.

const SEED = 20260806;
const PARTICLE_COUNT = 2200;
const SPEED = 0.95;
/** Slow fade: the filaments have to accumulate before the field reads as structure. */
const TRAIL_FADE = 'rgba(13, 13, 13, 0.018)';
const FIELD_SCALE = 300;
/** Frames composed before first paint, so the hero is never caught mid-assembly. */
const PRIME_STEPS = 320;
const STATIC_STEPS = 900;

/** Three ink tones, batched into three paths per frame to keep state changes low. */
const TONES = [
  'rgba(137, 135, 129, 0.38)',
  'rgba(195, 194, 183, 0.30)',
  'rgba(255, 255, 255, 0.26)',
] as const;

export function FlowField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const rng = decorativeRng(SEED);

    // Sum of four phase-shifted sine products: smooth, no noise library,
    // fully determined by SEED.
    const waves = Array.from({ length: 4 }, () => ({
      fx: 0.55 + rng() * 1.9,
      fy: 0.55 + rng() * 1.9,
      px: rng() * Math.PI * 2,
      py: rng() * Math.PI * 2,
      amp: 0.45 + rng() * 0.95,
    }));

    const angleAt = (x: number, y: number): number => {
      let a = 0;
      for (const w of waves) {
        a += w.amp * Math.sin(x * w.fx + w.px) * Math.cos(y * w.fy + w.py);
      }
      return a * 1.95;
    };

    const px = new Float32Array(PARTICLE_COUNT);
    const py = new Float32Array(PARTICLE_COUNT);
    const life = new Float32Array(PARTICLE_COUNT);
    const tone = new Uint8Array(PARTICLE_COUNT);

    let width = 0;
    let height = 0;
    // Priming is per-canvas-size, not per-resume. Re-priming on every
    // visibilitychange burns 320 synchronous steps and starves paint.
    let primed = false;

    const spawn = (i: number) => {
      px[i] = rng() * width;
      py[i] = rng() * height;
      life[i] = 90 + rng() * 320;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 1;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        spawn(i);
        tone[i] = Math.floor(rng() * TONES.length);
      }
      primed = false;
    };

    const step = () => {
      ctx.fillStyle = TRAIL_FADE;
      ctx.fillRect(0, 0, width, height);

      for (let t = 0; t < TONES.length; t++) {
        ctx.beginPath();
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          if (tone[i] !== t) continue;

          const x0 = px[i] as number;
          const y0 = py[i] as number;
          const a = angleAt(x0 / FIELD_SCALE, y0 / FIELD_SCALE);
          const x1 = x0 + Math.cos(a) * SPEED;
          const y1 = y0 + Math.sin(a) * SPEED;

          life[i] = (life[i] as number) - 1;

          // Respawn rather than wrap: a wrapped segment draws a streak across
          // the whole canvas.
          if ((life[i] as number) <= 0 || x1 < 0 || x1 > width || y1 < 0 || y1 > height) {
            spawn(i);
            continue;
          }

          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          px[i] = x1;
          py[i] = y1;
        }
        ctx.strokeStyle = TONES[t] as string;
        ctx.stroke();
      }
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const loop = () => {
      step();
      frame = window.requestAnimationFrame(loop);
    };

    const start = () => {
      window.cancelAnimationFrame(frame);
      if (reduceMotion.matches) {
        // Compose one still image and stop.
        if (!primed) {
          for (let i = 0; i < STATIC_STEPS; i++) step();
          primed = true;
        }
        return;
      }
      // Advance to a composed state before the first painted frame.
      if (!primed) {
        for (let i = 0; i < PRIME_STEPS; i++) step();
        primed = true;
      }
      frame = window.requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden) window.cancelAnimationFrame(frame);
      else start();
    };

    const observer = new ResizeObserver(() => {
      resize();
      start();
    });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    reduceMotion.addEventListener('change', start);

    resize();
    start();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduceMotion.removeEventListener('change', start);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
