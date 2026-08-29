import React from 'react';
import classNames from 'classnames';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  
  return (
    <div className={classNames("flex flex-col relative", className)}>
      <label 
        htmlFor={inputId}
        className={classNames(
          "text-xs font-medium absolute top-2 left-5 z-10 pointer-events-none transition-colors",
          error ? "text-md-error" : "text-md-on-surface-variant"
        )}
      >
        {label}
      </label>
      <input
        id={inputId}
        className={classNames(
          "bg-md-surface-container-low text-md-on-surface w-full h-14 pt-5 pb-1 px-5 rounded-xl border transition-colors duration-200 focus:outline-none text-sm placeholder:text-md-on-surface-variant/60",
          error
            ? "border-md-error focus:border-md-error ring-1 ring-md-error/50"
            : "border-md-outline/30 focus:border-md-primary"
        )}
        {...props}
      />
      {error && (
        <span className="text-xs text-md-error mt-1 pl-[1.2rem] font-medium">{error}</span>
      )}
    </div>
  );
};
