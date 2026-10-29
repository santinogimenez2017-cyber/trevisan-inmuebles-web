import { useEffect, useRef } from 'react';

/**
 * Hero background accent (React-Bits-style "dust + soft light").
 *
 * Budget: one 2D canvas, ~44 sprites drawn with drawImage (no shadowBlur, no per-frame gradients),
 * DPR capped at 1.5, loop paused whenever the hero is off-screen or the tab is hidden.
 * It never runs on touch devices or with prefers-reduced-motion, so phones keep a pure native scroll.
 *
 * Cursor reaction: a diffuse warm light eases toward the pointer and particles drift away from it
 * with a small depth-based parallax. Everything is eased, so it feels like air, not like physics.
 */

const COUNT = 44;

interface Particle {
  x: number; y: number;          // base position (px)
  size: number;                  // sprite size (px)
  vx: number; vy: number;        // drift (px / s)
  depth: number;                 // 0.3 … 1 → parallax strength
  alpha: number;
  twinkle: number;               // twinkle speed
  phase: number;
  ox: number; oy: number;        // eased cursor offset
}

function makeSprite(size: number, stops: Array<[number, string]>): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => grad.addColorStop(o, col));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  return c;
}

export function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.closest('section');
    if (!canvas || !host) return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduceMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let raf = 0;
    let inView = true;
    let last = 0;

    const dust = makeSprite(32, [[0, 'rgba(224,123,42,0.85)'], [0.35, 'rgba(224,123,42,0.35)'], [1, 'rgba(224,123,42,0)']]);
    const glow = makeSprite(256, [[0, 'rgba(255,190,120,0.30)'], [0.4, 'rgba(224,123,42,0.10)'], [1, 'rgba(224,123,42,0)']]);

    const pointer = { cx: -1, cy: -1 };                 // raw client coords
    const light = { x: 0, y: 0, strength: 0, target: 0 }; // eased light (px) + 0…1 intensity

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: 0, y: 0,
      size: rand(5, 15),
      vx: rand(-4, 4),
      vy: rand(-11, -3),
      depth: rand(0.3, 1),
      alpha: rand(0.25, 0.8),
      twinkle: rand(0.4, 1.4),
      phase: rand(0, Math.PI * 2),
      ox: 0, oy: 0,
    }));

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles.forEach(p => { p.x = rand(0, w); p.y = rand(0, h); });
      light.x = w * 0.7;
      light.y = h * 0.4;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;

      // cursor → canvas space
      const rect = canvas.getBoundingClientRect();
      const hasPointer = pointer.cx >= 0;
      const px = pointer.cx - rect.left;
      const py = pointer.cy - rect.top;
      if (hasPointer) { light.x += (px - light.x) * 0.07; light.y += (py - light.y) * 0.07; }
      light.strength += (light.target - light.strength) * 0.05;

      ctx.clearRect(0, 0, w, h);

      // diffuse warm light — a resting glow always, brighter near the cursor
      const gs = 520;
      ctx.globalAlpha = 0.35 + light.strength * 0.65;
      ctx.drawImage(glow, light.x - gs / 2, light.y - gs / 2, gs, gs);

      // dust
      for (const p of particles) {
        p.x += (p.vx + Math.sin(t * 0.3 + p.phase) * 2) * dt;
        p.y += p.vy * dt;
        if (p.y < -20) { p.y = h + 20; p.x = rand(0, w); }
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;

        // gentle push away from the cursor
        let tx = 0;
        let ty = 0;
        if (hasPointer) {
          const dx = p.x - px;
          const dy = p.y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < 24000) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / 155) * 38 * p.depth;
            tx = (dx / d) * f;
            ty = (dy / d) * f;
          }
        }
        p.ox += (tx - p.ox) * 0.08;
        p.oy += (ty - p.oy) * 0.08;

        const par = hasPointer ? (px / w - 0.5) * 24 * p.depth : 0;
        const a = p.alpha * (0.55 + 0.45 * Math.sin(t * p.twinkle + p.phase));
        ctx.globalAlpha = a;
        const s = p.size;
        ctx.drawImage(dust, p.x + p.ox + par - s / 2, p.y + p.oy - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    };

    const start = () => {
      if (raf || !inView || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const onMove = (e: Event) => {
      const pe = e as PointerEvent;
      pointer.cx = pe.clientX;
      pointer.cy = pe.clientY;
      light.target = 1;
    };
    const onLeave = () => { light.target = 0; pointer.cx = -1; };
    const onVisibility = () => (document.hidden ? stop() : start());

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start(); else stop();
    });
    io.observe(host);

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    resize();
    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />;
}
