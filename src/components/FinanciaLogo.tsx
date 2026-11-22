import React from 'react';

interface FinanciaLogoProps {
  variant?: 'light' | 'dark';
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: { icon: 24, text: 'text-[16px]', gap: 'gap-2' },
  md: { icon: 28, text: 'text-[18px]', gap: 'gap-2.5' },
  lg: { icon: 34, text: 'text-[21px]', gap: 'gap-3' },
} as const;

export const FinanciaLogo: React.FC<FinanciaLogoProps> = ({
  variant = 'dark',
  showWordmark = true,
  size = 'md',
  className = '',
}) => {
  const isLight = variant === 'light';
  const metrics = SIZE_MAP[size];
  const frameFill = isLight ? '#0b1224' : '#090e1a';
  const frameStroke = isLight ? 'rgba(148, 163, 184, 0.32)' : 'rgba(9, 14, 26, 0.14)';
  const primaryMark = '#ffffff';
  const accentMark = isLight ? '#38bdf8' : '#2563eb';
  const horizonArc = isLight ? '#93c5fd' : '#60a5fa';

  return (
    <span className={`inline-flex items-center ${metrics.gap} select-none ${className}`}>
      <svg
        width={metrics.icon}
        height={metrics.icon}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="8"
          fill={frameFill}
          stroke={frameStroke}
          strokeWidth="1.2"
        />
        <path
          d="M 5.5 23.8 Q 16 19.2 26.5 23.8"
          stroke={horizonArc}
          strokeOpacity="0.45"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <path
          d="M 9.2 22.8 V 9.4 C 9.2 8.7 9.75 8.2 10.45 8.2 H 23.2 L 21.1 11.7 H 13.0 V 14.4 H 19.6 L 17.8 17.7 H 13.0 V 22.8 H 9.2 Z"
          fill={primaryMark}
        />
        <path
          d="M 18.8 22.8 L 22.8 14.6 H 25.4 L 21.6 22.8 H 18.8 Z"
          fill={accentMark}
        />
      </svg>
      {showWordmark && (
        <span
          className={`font-display ${metrics.text} font-semibold tracking-[-0.03em] leading-none whitespace-nowrap ${
            isLight ? 'text-white' : 'text-[#090e1a]'
          }`}
        >
          Financia
        </span>
      )}
    </span>
  );
};
