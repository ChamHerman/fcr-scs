import React, { useRef } from 'react';
import classNames from 'classnames';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'animated-primary' | 'tonal' | 'secondary' | 'combined' | 'outlined' | 'danger' | 'text' | 'fab';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'filled',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);

  const isTrulyDisabled = disabled && !isLoading;

  const baseClasses = 'inline-flex relative overflow-hidden items-center justify-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 transition-colors duration-200';

  /**
   * Disabled keeps the variant's own skin (fill, border, elevation, ghost) and
   * simply drains the colour out of it, so an outlined button stays outlined and
   * a text button stays a ghost. No `pointer-events-none` here on purpose — it
   * would suppress `cursor-not-allowed`, the only feedback a dead button gives.
   */
  const disabledClasses = 'grayscale opacity-60 cursor-not-allowed';

  const sizeClasses = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-10 px-6 text-sm',
    lg: 'h-12 px-8 text-base',
  };

  // Static skin — always applied, disabled or not.
  const variantClasses = {
    filled: 'bg-md-primary text-md-on-primary shadow-sm rounded-full',
    'animated-primary': 'bg-md-primary text-md-on-primary shadow-sm rounded-full',
    tonal: 'bg-md-secondary-container text-md-on-secondary-container rounded-full',
    secondary: 'bg-md-secondary-container text-md-on-secondary-container rounded-full',
    combined: 'bg-transparent text-md-primary border border-md-outline rounded-full',
    outlined: 'bg-transparent text-md-primary border border-md-outline rounded-full',
    danger: 'bg-md-error text-md-on-error rounded-full',
    text: 'bg-transparent text-md-primary rounded-full',
    fab: 'bg-md-tertiary text-md-background shadow-md rounded-2xl h-14 w-14 p-0',
  };

  // Hover affordances live apart from the skin: CSS `:hover` still matches a
  // disabled button, so these must be withheld rather than overridden.
  const hoverClasses = {
    filled: 'hover:shadow-md',
    'animated-primary': 'hover:shadow-md',
    tonal: 'hover:bg-md-secondary-container/80',
    secondary: 'hover:bg-md-secondary-container/80',
    combined: 'hover:bg-md-primary/10',
    outlined: 'hover:bg-md-primary/10',
    danger: 'hover:bg-md-error/90',
    text: 'hover:bg-md-primary/10',
    fab: 'hover:shadow-xl hover:bg-md-tertiary/90',
  };

  const classes = classNames(
    baseClasses,
    variant !== 'fab' ? sizeClasses[size] : '',
    variantClasses[variant],
    isTrulyDisabled ? disabledClasses : hoverClasses[variant],
    isLoading ? 'cursor-wait opacity-90' : '',
    className
  );

  const { contextSafe } = useGSAP({ scope: buttonRef });

  const handleMouseEnter = contextSafe((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isTrulyDisabled && !isLoading) {
      gsap.to(buttonRef.current, {
        scale: 1.02,
        duration: 0.4,
        ease: 'back.out(1.5)',
        overwrite: 'auto'
      });
      if (shimmerRef.current) {
        gsap.fromTo(
          shimmerRef.current,
          { xPercent: -120 },
          {
            xPercent: 220,
            duration: 0.75,
            ease: 'power1.inOut',
          }
        );
      }
    }
    onMouseEnter?.(e);
  });

  const handleMouseLeave = contextSafe((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isTrulyDisabled && !isLoading) {
      gsap.to(buttonRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
    onMouseLeave?.(e);
  });

  const handleMouseDown = contextSafe((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isTrulyDisabled && !isLoading) {
      gsap.to(buttonRef.current, {
        scale: 0.95,
        duration: 0.15,
        ease: 'power1.inOut',
        overwrite: 'auto'
      });
    }
    onMouseDown?.(e);
  });

  const handleMouseUp = contextSafe((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isTrulyDisabled && !isLoading) {
      gsap.to(buttonRef.current, {
        scale: 1.02,
        duration: 0.3,
        ease: 'back.out(1.5)',
        overwrite: 'auto'
      });
    }
    onMouseUp?.(e);
  });

  return (
    <button 
      ref={buttonRef}
      className={classes} 
      disabled={isLoading || isTrulyDisabled} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      {...props}
    >
      {/* Universal GSAP Shimmer bar triggered on hover */}
      {!isTrulyDisabled && !isLoading && (
        <div 
          ref={shimmerRef} 
          className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-[var(--md-shimmer,rgba(255,255,255,0.25))] to-transparent w-full h-full -translate-x-full"
        />
      )}
      <span className={classNames("relative z-10 flex items-center justify-center gap-2 transition-opacity duration-300", isLoading ? "opacity-0" : "opacity-100")}>
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 z-20 flex items-center justify-center text-current font-semibold">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
    </button>
  );
};
