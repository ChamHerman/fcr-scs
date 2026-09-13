import React, { useRef } from 'react';
import { Search } from 'lucide-react';
import classNames from 'classnames';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ 
  containerClassName, 
  className, 
  onFocus, 
  onBlur, 
  ...props 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        scale: 1.15,
        color: 'var(--md-primary)',
        opacity: 1,
        duration: 0.4,
        ease: 'back.out(2)'
      });
    }
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 1.02,
        duration: 0.4,
        ease: 'back.out(1.5)'
      });
    }
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        scale: 1,
        color: 'currentColor',
        opacity: 0.5,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
    onBlur?.(e);
  };

  return (
    <div 
      ref={containerRef}
      className={classNames(
        "relative flex-1 min-w-[200px]",
        containerClassName
      )}
    >
      <Search 
        ref={iconRef}
        className="absolute left-[14px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] opacity-50 text-md-on-surface-variant z-10 pointer-events-none" 
      />
      <input
        className={classNames(
          "w-full py-[10px] pr-[16px] pl-[42px] rounded-full text-[14px]",
          "bg-md-surface-container-low text-md-on-surface placeholder:text-md-on-surface-variant/70",
          "border-[1.5px] border-md-outline/25 outline-none",
          "focus:border-md-primary focus:ring-1 focus:ring-md-primary",
          "transition-colors duration-200",
          className
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    </div>
  );
};
