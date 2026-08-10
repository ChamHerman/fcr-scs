import React from 'react';
import classNames from 'classnames';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  clickable?: boolean;
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  interactive = true,
  clickable,
  elevation = 'sm',
  className,
  children,
  onClick,
  ...props
}) => {
  const baseClasses = 'bg-md-surface-container rounded-xl p-6 md:p-8 transition-all duration-300 ease-md-bouncy';
  
  const elevationClasses = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };
  
  const isPointer = clickable || Boolean(onClick);

  const interactiveClasses = interactive
    ? 'hover:shadow-md hover:scale-[1.02] hover:bg-md-on-surface-variant/10 group'
    : '';

  const pointerClass = isPointer ? 'cursor-pointer' : '';

  const classes = classNames(
    baseClasses,
    elevationClasses[elevation],
    interactiveClasses,
    pointerClass,
    className
  );

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
};
