/**
 * FluidAurora — Canvas-based fluid dynamics background
 *
 * 基于 Canvas 的流体动力学背景，模拟深邃科技感的极光流动效果。
 * 使用多层叠加的 Perlin-like noise 场驱动粒子运动，营造有机流动感。
 */

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colorIdx: number;
  alpha: number;
}

// Simplex-like noise via trigonometric approximation (no external lib)
function noise(x: number, y: number, t: number): number {
  const v1 = Math.sin(x * 0.8 + t * 0.3) * Math.cos(y * 0.6 + t * 0.2);
  const v2 = Math.sin(x * 0.3 - y * 0.5 + t * 0.15) * 0.5;
  const v3 = Math.cos((x + y) * 0.4 + t * 0.1) * 0.3;
  return (v1 + v2 + v3) / 1.8;
}

function flowAngle(x: number, y: number, t: number): number {
  return noise(x * 0.004, y * 0.004, t) * Math.PI * 4;
}

// Color palette: deep violet, electric blue, teal
const PALETTE = [
  [109, 40, 217],   // violet #6D28D9
  [124, 58, 237],   // purple #7C3AED
  [59, 130, 246],   // blue #3B82F6
  [14, 165, 233],   // sky #0EA5E9
  [6, 182, 212],    // cyan #06B6D4
  [167, 139, 250],  // lavender #A78BFA
];

export function FluidAurora({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true })!;
    let W = 0, H = 0;
    let t = 0;
    const particles: Particle[] = [];
    const MAX_PARTICLES = 180;
    const canvasEl = canvas;

    function resize() {
      W = canvasEl.offsetWidth;
      H = canvasEl.offsetHeight;
      canvasEl.width = W;
      canvasEl.height = H;
    }

    function spawnParticle(): Particle {
      const edge = Math.random();
      let x: number, y: number;
      if (edge < 0.3) { x = Math.random() * W; y = 0; }
      else if (edge < 0.5) { x = Math.random() * W; y = H; }
      else if (edge < 0.75) { x = 0; y = Math.random() * H; }
      else { x = W; y = Math.random() * H; }

      const maxLife = 180 + Math.random() * 240;
      return {
        x, y,
        vx: 0, vy: 0,
        life: 0,
        maxLife,
        size: 1.2 + Math.random() * 3.5,
        colorIdx: Math.floor(Math.random() * PALETTE.length),
        alpha: 0,
      };
    }

    function init() {
      for (let i = 0; i < MAX_PARTICLES * 0.6; i++) {
        const p = spawnParticle();
        p.life = Math.random() * p.maxLife;
        particles.push(p);
      }
    }

    function draw() {
      t += 0.004;

      // Fade trail — very dark semi-transparent fill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.045)';
      ctx.fillRect(0, 0, W, H);

      // Spawn new particles
      while (particles.length < MAX_PARTICLES) {
        particles.push(spawnParticle());
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;

        // Life-based alpha curve (ease in/out)
        const lifeRatio = p.life / p.maxLife;
        p.alpha = lifeRatio < 0.15
          ? lifeRatio / 0.15
          : lifeRatio > 0.75
            ? (1 - lifeRatio) / 0.25
            : 1;

        // Flow field velocity
        const angle = flowAngle(p.x, p.y, t);
        const speed = 0.4 + noise(p.x * 0.006, p.y * 0.006, t * 0.5) * 0.6;
        p.vx += Math.cos(angle) * speed * 0.18;
        p.vy += Math.sin(angle) * speed * 0.18;

        // Damping
        p.vx *= 0.92;
        p.vy *= 0.92;

        p.x += p.vx;
        p.y += p.vy;

        // Draw particle as glowing dot
        const [r, g, b] = PALETTE[p.colorIdx];
        const baseAlpha = p.alpha * 0.55;

        // Outer glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grad.addColorStop(0, `rgba(${r},${g},${b},${baseAlpha * 0.7})`);
        grad.addColorStop(0.4, `rgba(${r},${g},${b},${baseAlpha * 0.2})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * 0.9})`;
        ctx.fill();

        // Remove dead particles
        if (p.life >= p.maxLife || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) {
          particles.splice(i, 1);
        }
      }

      // Ambient aurora blobs — large soft gradients
      const blobTime = t * 0.3;
      const blobs = [
        { x: W * (0.2 + Math.sin(blobTime * 0.7) * 0.12), y: H * (0.15 + Math.cos(blobTime * 0.5) * 0.08), r: W * 0.45, color: [109, 40, 217], a: 0.055 },
        { x: W * (0.75 + Math.cos(blobTime * 0.6) * 0.1), y: H * (0.5 + Math.sin(blobTime * 0.4) * 0.12), r: W * 0.38, color: [59, 130, 246], a: 0.03 },
        { x: W * (0.4 + Math.sin(blobTime * 0.8) * 0.08), y: H * (0.8 + Math.cos(blobTime * 0.9) * 0.06), r: W * 0.35, color: [124, 58, 237], a: 0.04 },
      ];

      for (const blob of blobs) {
        const g = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
        const [r, gb, b] = blob.color;
        g.addColorStop(0, `rgba(${r},${gb},${b},${blob.a})`);
        g.addColorStop(0.5, `rgba(${r},${gb},${b},${blob.a * 0.4})`);
        g.addColorStop(1, `rgba(${r},${gb},${b},0)`);
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvasEl);
    resize();
    init();
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden
    />
  );
}
