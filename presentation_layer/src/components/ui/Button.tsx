import React, { useRef } from 'react';
import classNames from 'classnames';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'animated-primary' | 'tonal' | 'secondary' | 'combined' | 'outlined' | 'text' | 'fab';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'animated-primary', // Changed default to animated-primary as requested
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

  // Removed active:scale-95 to let GSAP handle the press interaction
  const baseClasses = 'inline-flex relative items-center justify-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed';
  
  const sizeClasses = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-10 px-6 text-sm',
    lg: 'h-12 px-8 text-base',
  };

  const variantClasses = {
    // Make filled essentially the same as animated-primary just in case some buttons use it
    filled: 'bg-md-primary text-md-on-primary shadow-sm hover:shadow-md rounded-full relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full hover:before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
    'animated-primary': 'bg-md-primary text-md-on-primary shadow-sm hover:shadow-md rounded-full relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full hover:before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
    tonal: 'bg-md-secondary-container text-md-on-secondary-container hover:bg-md-secondary-container/90 rounded-full',
    secondary: 'bg-md-secondary-container text-md-on-secondary-container hover:bg-md-secondary-container/90 rounded-full',
    combined: 'bg-gradient-to-r from-md-primary/90 to-md-secondary-container text-md-on-primary shadow-sm hover:shadow-md hover:from-md-primary hover:to-md-secondary-container/90 rounded-full',
    outlined: 'bg-transparent text-md-primary border border-md-outline hover:bg-md-primary/5 rounded-full',
    text: 'bg-transparent text-md-primary hover:bg-md-primary/10 rounded-full',
    fab: 'bg-md-tertiary text-md-background shadow-md hover:shadow-xl hover:bg-md-tertiary/90 rounded-2xl h-14 w-14 p-0',
  };

  const classes = classNames(
    baseClasses,
    variant !== 'fab' ? sizeClasses[size] : '',
    variantClasses[variant],
    className
  );

  const { contextSafe } = useGSAP({ scope: buttonRef });

  const handleMouseEnter = contextSafe((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      gsap.to(buttonRef.current, {
        scale: 1.02,
        duration: 0.4,
        ease: 'back.out(1.5)',
        overwrite: 'auto'
      });
    }
    onMouseEnter?.(e);
  });

  const handleMouseLeave = contextSafe((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
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
    if (!disabled && !isLoading) {
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
    if (!disabled && !isLoading) {
      gsap.to(buttonRef.current, {
        scale: 1.02, // Return to hover scale since we are still hovering
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
      disabled={isLoading || disabled} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      {...props}
    >
      <span className={classNames("flex items-center justify-center transition-opacity duration-300", isLoading ? "opacity-0" : "opacity-100")}>
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
    </button>
  );
};
