import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

interface AlpineAuthCanvasProps {
  compact?: boolean;
}

export const AlpineAuthCanvas: React.FC<AlpineAuthCanvasProps> = ({ compact = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [paused, setPaused] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (compact) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;
    let lastTick = performance.now();

    const drawFrame = (tPhase: number) => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(320, Math.floor(rect.height));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // 1. Atmospheric Glacial Sky Gradient
      const sky = ctx.createLinearGradient(0, 0, width * 0.25, height);
      sky.addColorStop(0, '#5A7B8E');
      sky.addColorStop(0.28, '#95C2D4');
      sky.addColorStop(0.58, '#C8E6F0');
      sky.addColorStop(0.84, '#DDEEF4');
      sky.addColorStop(1, '#CBDCE5');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // Soft zenith mist bloom
      const mist = ctx.createRadialGradient(
        width * 0.56,
        height * 0.22,
        12,
        width * 0.52,
        height * 0.35,
        width * 0.72
      );
      mist.addColorStop(0, 'rgba(235, 249, 255, 0.75)');
      mist.addColorStop(0.45, 'rgba(138, 206, 232, 0.38)');
      mist.addColorStop(1, 'rgba(90, 123, 142, 0)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, 0, width, height);

      // 2. Sculpted Glacier Ridge Layers (Left & Right Alpine Wall)
      // Far right towering sunlit ridge
      const rightRidgeGrad = ctx.createLinearGradient(width * 0.45, 0, width, height * 0.88);
      rightRidgeGrad.addColorStop(0, 'rgba(229, 245, 252, 0.92)');
      rightRidgeGrad.addColorStop(0.55, 'rgba(148, 193, 212, 0.85)');
      rightRidgeGrad.addColorStop(1, 'rgba(92, 134, 156, 0.9)');
      ctx.beginPath();
      ctx.moveTo(width * 0.28, height * 0.82);
      ctx.lineTo(width * 0.54, height * 0.36);
      ctx.lineTo(width * 0.68, height * 0.22);
      ctx.lineTo(width * 0.84, height * 0.04);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height * 0.9);
      ctx.closePath();
      ctx.fillStyle = rightRidgeGrad;
      ctx.fill();

      // Secondary sunlit glacier spur facet for crystalline depth
      ctx.beginPath();
      ctx.moveTo(width * 0.52, height * 0.78);
      ctx.lineTo(width * 0.74, height * 0.34);
      ctx.lineTo(width * 0.92, height * 0.14);
      ctx.lineTo(width, height * 0.28);
      ctx.lineTo(width, height * 0.86);
      ctx.closePath();
      ctx.fillStyle = 'rgba(218, 242, 252, 0.32)';
      ctx.fill();

      // Left jagged ice wall
      const leftRidgeGrad = ctx.createLinearGradient(0, height * 0.1, width * 0.52, height * 0.86);
      leftRidgeGrad.addColorStop(0, 'rgba(176, 213, 228, 0.92)');
      leftRidgeGrad.addColorStop(0.5, 'rgba(116, 161, 184, 0.86)');
      leftRidgeGrad.addColorStop(1, 'rgba(203, 224, 236, 0.9)');
      ctx.beginPath();
      ctx.moveTo(0, height * 0.08);
      ctx.lineTo(width * 0.19, height * 0.26);
      ctx.lineTo(width * 0.36, height * 0.48);
      ctx.lineTo(width * 0.58, height * 0.78);
      ctx.lineTo(0, height * 0.86);
      ctx.closePath();
      ctx.fillStyle = leftRidgeGrad;
      ctx.fill();

      // Sunlit ice-ridge rim highlight strokes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(width * 0.35, height * 0.76);
      ctx.lineTo(width * 0.67, height * 0.22);
      ctx.lineTo(width * 0.86, height * 0.04);
      ctx.stroke();

      // 3. Foreground Textured Alpine Snowfield Floor
      const snowGrad = ctx.createLinearGradient(0, height * 0.72, 0, height);
      snowGrad.addColorStop(0, '#C7DCE7');
      snowGrad.addColorStop(0.45, '#DFECF3');
      snowGrad.addColorStop(1, '#EBF3F8');
      ctx.beginPath();
      ctx.moveTo(0, height * 0.77);
      ctx.quadraticCurveTo(width * 0.48, height * 0.71, width, height * 0.76);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = snowGrad;
      ctx.fill();

      // Subtle sculpted snow drifts in foreground
      for (let i = 0; i < 6; i += 1) {
        const yBase = height * (0.78 + i * 0.038);
        ctx.beginPath();
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= width; x += width / 8) {
          const offset = Math.sin(x * 0.025 + i * 1.4) * 6;
          ctx.lineTo(x, yBase + offset);
        }
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(130, 166, 186, 0.28)' : 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 4. Luminous Telemetry Contour Wave Lines Flowing Across Peaks (Signature "Look first / Then leap." Trail)
      const waveConfigs = [
        { amp: 24, yStart: 0.66, yEnd: 0.14, freq: 0.011, speed: 1.0, alpha: 0.62, width: 1.6 },
        { amp: 18, yStart: 0.71, yEnd: 0.23, freq: 0.013, speed: 0.75, alpha: 0.42, width: 1.2 },
        { amp: 14, yStart: 0.62, yEnd: 0.09, freq: 0.009, speed: 1.25, alpha: 0.28, width: 1.0 },
      ];

      for (const w of waveConfigs) {
        ctx.save();
        ctx.beginPath();
        for (let x = 0; x <= width; x += 6) {
          const progress = x / width;
          const baseY = height * (w.yStart + (w.yEnd - w.yStart) * Math.pow(progress, 0.92));
          const harmonic =
            Math.sin(x * w.freq + tPhase * w.speed) * w.amp +
            Math.cos(x * w.freq * 1.8 - tPhase * 0.6) * (w.amp * 0.45);
          const py = baseY + harmonic;
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        }
        ctx.strokeStyle = `rgba(225, 252, 255, ${w.alpha})`;
        ctx.lineWidth = w.width;
        ctx.shadowColor = 'rgba(125, 227, 255, 0.65)';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      }
    };

    drawFrame(phase);

    if (paused) {
      return undefined;
    }

    const step = (now: number) => {
      if (now - lastTick >= 33) {
        phase += 0.028;
        lastTick = now;
        drawFrame(phase);
      }
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [paused, compact]);

  if (compact) {
    return (
      <div
        className="relative w-full rounded-2xl overflow-hidden px-5 py-6 text-center border border-white/10"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 0%, #8FC3D9 0%, #5B8CA6 45%, #244559 100%)',
        }}
      >
        <p className="font-display font-bold text-xl text-white tracking-tight">
          Look first / Then leap.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="alpine-auth-canvas"
      data-animation-paused={paused ? 'true' : 'false'}
      className="relative w-full h-full rounded-2xl overflow-hidden select-none bg-[#5A7B8E]"
    >
      {/* Procedural Glacier & Luminous Market Contour Canvas */}
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full block" />

      {/* Centered Explorer Astronaut Silhouette (Branded Financia Chest Mark — No TV Logo) */}
      <svg
        viewBox="0 0 320 420"
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 bottom-[7%] -translate-x-1/2 w-[50%] max-w-[270px] h-auto drop-shadow-[0_18px_28px_rgba(25,52,70,0.34)]"
      >
        <defs>
          <linearGradient id="suitMain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5FAFC" />
            <stop offset="55%" stopColor="#D7E5EC" />
            <stop offset="100%" stopColor="#A9C0CC" />
          </linearGradient>
          <linearGradient id="suitShadow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7C94A3" />
            <stop offset="100%" stopColor="#4F6675" />
          </linearGradient>
          <radialGradient id="visorGlass" cx="42%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#3B4E5C" />
            <stop offset="55%" stopColor="#141C24" />
            <stop offset="100%" stopColor="#080C10" />
          </radialGradient>
        </defs>

        {/* Ground Shadow in Snow */}
        <ellipse cx="160" cy="396" rx="48" ry="10" fill="rgba(78, 108, 128, 0.34)" />

        {/* Left & Right Legs (Forward Stride) */}
        <path
          d="M126 244 L112 318 L108 378 L138 384 L148 320 L156 254 Z"
          fill="url(#suitMain)"
        />
        <path
          d="M168 248 L184 316 L190 364 L218 358 L206 306 L194 244 Z"
          fill="url(#suitMain)"
        />
        {/* Knee Pads */}
        <rect x="110" y="302" width="28" height="22" rx="9" fill="#89A0AE" />
        <rect x="181" y="294" width="26" height="20" rx="8" fill="#89A0AE" />
        {/* Boots */}
        <path d="M104 374 C104 388 140 392 142 378 Z" fill="#9FB3BF" />
        <path d="M188 356 C192 370 222 366 220 352 Z" fill="#89A0AE" />

        {/* Backpack Silhouetted Edges */}
        <rect x="102" y="108" width="116" height="106" rx="18" fill="#9AB1BF" />

        {/* Arms */}
        <path
          d="M108 124 L74 178 L80 222 L106 218 L104 182 L124 142 Z"
          fill="url(#suitMain)"
        />
        <path
          d="M212 124 L244 176 L236 220 L212 216 L216 180 L196 142 Z"
          fill="url(#suitMain)"
        />
        {/* Gloves */}
        <circle cx="92" cy="224" r="14" fill="#637988" />
        <circle cx="224" cy="222" r="14" fill="#637988" />

        {/* Torso Chest Plate */}
        <rect x="108" y="114" width="104" height="134" rx="26" fill="url(#suitMain)" />
        {/* Harness Straps */}
        <rect x="122" y="114" width="14" height="122" rx="4" fill="#697F8E" />
        <rect x="184" y="114" width="14" height="122" rx="4" fill="#697F8E" />
        <rect x="110" y="206" width="100" height="24" rx="6" fill="#7D95A3" />
        <rect x="148" y="204" width="24" height="28" rx="4" fill="#B5C7D2" />

        {/* Subtle Financia Bars Mark on Chest Pack (Clean Original Identity) */}
        <g transform="translate(150, 152)" opacity="0.88">
          <rect x="0" y="7" width="4" height="9" rx="1" fill="#3B5160" />
          <rect x="7" y="4" width="4" height="12" rx="1" fill="#2962FF" />
          <rect x="14" y="0" width="4" height="16" rx="1" fill="#3B5160" />
        </g>

        {/* Helmet & Visor */}
        <ellipse cx="160" cy="82" rx="42" ry="44" fill="url(#suitMain)" />
        <ellipse cx="160" cy="84" rx="31" ry="30" fill="url(#visorGlass)" />
        {/* Visor Horizon Reflection */}
        <path
          d="M137 74 C146 64 172 64 182 72"
          fill="none"
          stroke="rgba(182, 232, 255, 0.35)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Top Centered Headline Matching Reference Composition */}
      <div className="relative z-10 pt-10 md:pt-12 px-6 text-center pointer-events-none">
        <h2
          className="font-display font-bold text-white tracking-[-0.02em] drop-shadow-[0_2px_12px_rgba(16,44,62,0.35)]"
          style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.35rem)', lineHeight: 1.15 }}
        >
          Look first / Then leap.
        </h2>
      </div>

      {/* Bottom-Right Subtle Translucent Pause/Play Animation Toggle */}
      <button
        type="button"
        onClick={() => setPaused((prev) => !prev)}
        aria-label={paused ? 'Play background animation' : 'Pause background animation'}
        aria-pressed={paused}
        className="absolute bottom-4 right-4 z-20 w-8 h-8 rounded-lg bg-[#1F242D]/55 hover:bg-[#1F242D]/80 border border-white/20 text-white backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer"
      >
        {paused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
