import React from 'react';
import classNames from 'classnames';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  ariaLabel?: string;
  variant?: 'neutral' | 'primary' | 'danger';
  size?: 'sm' | 'md';
}

/**
 * MD3 ghost icon button for inline row actions (DESIGN.md — Admin List &
 * Row-Action Patterns). Icon-only, so it always needs a `title` tooltip and
 * an `aria-label`. Destructive actions use the `danger` tint.
 */
export const IconButton: React.FC<IconButtonProps> = ({
  title,
  ariaLabel,
  variant = 'neutral',
  size = 'sm',
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    neutral: 'text-md-on-surface-variant hover:bg-md-on-surface/8 hover:text-md-on-surface',
    primary: 'text-md-primary hover:bg-md-primary/10',
    danger: 'text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-400/10 focus-visible:ring-red-500',
  }[variant];

  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel ?? title}
      className={classNames(
        'inline-flex items-center justify-center rounded-full transition-colors duration-200',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        variantClasses,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
