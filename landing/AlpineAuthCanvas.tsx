import React, { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { MeadowGrass3D } from './MeadowGrass3D';

interface AlpineAuthCanvasProps {
  compact?: boolean;
}

export const AlpineAuthCanvas: React.FC<AlpineAuthCanvasProps> = ({ compact = false }) => {
  const [paused, setPaused] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  if (compact) {
    return (
      <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-white/15 bg-[#12202B]">
        <img
          src="/assets/aistudio/image_612bb5a4.png"
          alt="Astronaut seated in a sunlit misty meadow"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-[56%_48%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#091017]/85 via-[#091017]/30 to-[#091017]/50"
        />
        <div className="absolute inset-0 flex items-end justify-center p-4 text-center">
          <p className="font-display font-bold text-xl text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
            Look first / Then leap.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="alpine-auth-canvas"
      data-animation-paused={paused ? 'true' : 'false'}
      className="relative w-full h-full rounded-2xl overflow-hidden select-none bg-[#1B3142]"
    >
      {/* 1. Photorealistic Astronaut & Sunlit Misty Meadow Backdrop */}
      <img
        src="/assets/aistudio/image_612bb5a4.png"
        alt="Astronaut seated in a sunlit misty grass and daisy meadow"
        referrerPolicy="no-referrer"
        className={`absolute inset-0 w-full h-full object-cover object-[58%_46%] transition-transform duration-1000 ${
          paused ? 'scale-100' : 'animate-meadow-breathe'
        }`}
      />

      {/* 2. Subtle Atmospheric Top-Right Volumetric Light Sheen & Depth Scrim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            'radial-gradient(ellipse 68% 58% at 88% 12%, rgba(255, 240, 200, 0.22) 0%, rgba(160, 208, 232, 0.08) 45%, transparent 75%), linear-gradient(180deg, rgba(14, 28, 40, 0.34) 0%, rgba(14, 28, 40, 0.03) 44%, rgba(8, 17, 25, 0.28) 100%)',
        }}
      />

      {/* 3. Subtle Golden Helmet Visor Warm Glow Accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-[3] rounded-full blur-2xl"
        style={{
          left: '51%',
          top: '27%',
          width: '124px',
          height: '124px',
          background: 'radial-gradient(circle, rgba(255, 205, 118, 0.26) 0%, transparent 70%)',
        }}
      />

      {/* 4. Real-Time Three.js 3D Animated Grass, Daisies & Sunlit Pollen Meadow */}
      <MeadowGrass3D paused={paused} />

      {/* 5. Seamless Lower-Edge Meadow Shadow Grounding */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 z-[5] bg-gradient-to-t from-[#060C12]/80 via-[#081119]/30 to-transparent"
      />

      {/* 6. Top Centered Signature Headline */}
      <div className="relative z-10 pt-10 md:pt-12 px-6 text-center pointer-events-none">
        <h2
          className="font-display font-bold text-white tracking-[-0.02em] drop-shadow-[0_3px_18px_rgba(8,20,30,0.65)]"
          style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.35rem)', lineHeight: 1.15 }}
        >
          Look first / Then leap.
        </h2>
      </div>

      {/* 7. Bottom-Right Subtle Pause/Play Animation Toggle (Solid translucent fill — zero backdrop-blur over WebGL) */}
      <button
        type="button"
        onClick={() => setPaused((prev) => !prev)}
        aria-label={paused ? 'Play 3D meadow animation' : 'Pause 3D meadow animation'}
        aria-pressed={paused}
        className="absolute bottom-4 right-4 z-20 w-8 h-8 rounded-lg bg-[#0D1822]/85 hover:bg-[#162736] border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
      >
        {paused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
