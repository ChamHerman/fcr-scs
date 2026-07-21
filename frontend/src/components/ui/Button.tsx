import React from 'react';
import classNames from 'classnames';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'fab';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'filled',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-300 ease-md-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 active:scale-95';
  
  const sizeClasses = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-10 px-6 text-sm',
    lg: 'h-12 px-8 text-base',
  };

  const variantClasses = {
    filled: 'bg-md-primary text-md-on-primary shadow-none hover:shadow-md hover:bg-md-primary/90 active:bg-md-primary/80 rounded-full',
    tonal: 'bg-md-secondary-container text-md-on-secondary-container hover:bg-md-secondary-container/90 active:bg-md-secondary-container/80 rounded-full',
    outlined: 'bg-transparent text-md-primary border border-md-outline hover:bg-md-primary/5 active:bg-md-primary/10 rounded-full',
    text: 'bg-transparent text-md-primary hover:bg-md-primary/10 active:bg-md-primary/20 rounded-full',
    fab: 'bg-md-tertiary text-md-background shadow-md hover:shadow-xl hover:bg-md-tertiary/90 active:bg-md-tertiary/80 rounded-2xl h-14 w-14 p-0',
  };

  const classes = classNames(
    baseClasses,
    variant !== 'fab' ? sizeClasses[size] : '',
    variantClasses[variant],
    className
  );

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};
