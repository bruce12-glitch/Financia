import React from 'react';

interface FinanciaLogoProps {
  variant?: 'light' | 'dark';
  showWordmark?: boolean;
  className?: string;
}

export const FinanciaLogo: React.FC<FinanciaLogoProps> = ({
  variant = 'light',
  showWordmark = true,
  className = '',
}) => {
  const fill = variant === 'light' ? '#FFFFFF' : '#131722';
  const accent = '#2962FF';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width="26"
        height="18"
        viewBox="0 0 28 20"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="0" y="2" width="14" height="4" rx="1" fill={fill} />
        <rect x="0" y="8.5" width="10" height="3.8" rx="1" fill={fill} />
        <rect x="0" y="2" width="4" height="16" rx="1" fill={fill} />
        <rect x="14" y="10" width="3.5" height="8" rx="1" fill={accent} />
        <rect x="19.5" y="6" width="3.5" height="12" rx="1" fill={accent} />
        <rect x="24.5" y="2" width="3.5" height="16" rx="1" fill={fill} />
      </svg>
      {showWordmark && (
        <span
          className={`text-lg font-display font-bold tracking-tight ${
            variant === 'light' ? 'text-white' : 'text-[#131722]'
          }`}
        >
          Financia
        </span>
      )}
    </span>
  );
};
