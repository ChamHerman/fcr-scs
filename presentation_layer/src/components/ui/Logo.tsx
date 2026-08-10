import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-9 h-9 text-md-primary', size = 36 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Land boundary geometric hexagon */}
      <path 
        d="M20 4L4 13V27L20 36L36 27V13L20 4Z" 
        fill="currentColor" 
        fillOpacity="0.15" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinejoin="round"
      />
      {/* Inner faceted land plot */}
      <path 
        d="M20 10L10 16V24L20 30L30 24V16L20 10Z" 
        fill="currentColor" 
        fillOpacity="0.25"
      />
      {/* Smart contract lightning bolt mark */}
      <path 
        d="M22 11L13 22H20L18 29L27 18H20L22 11Z" 
        fill="currentColor"
      />
    </svg>
  );
};
