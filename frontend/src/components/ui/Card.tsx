import React from 'react';
import classNames from 'classnames';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  interactive = false,
  elevation = 'sm',
  className,
  children,
  ...props
}) => {
  const baseClasses = 'bg-md-surface-container rounded-lg p-6 md:p-8 transition-all duration-300 ease-md-emphasized';
  
  const elevationClasses = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };
  
  const interactiveClasses = interactive
    ? 'hover:shadow-md hover:scale-[1.02] hover:bg-md-surface-variant/20 cursor-pointer group'
    : '';

  const classes = classNames(
    baseClasses,
    elevationClasses[elevation],
    interactiveClasses,
    className
  );

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
