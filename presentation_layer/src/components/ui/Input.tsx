import React from 'react';
import classNames from 'classnames';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  error?: string;
  prefix?: React.ReactNode;
  prefixClassName?: string;
  suffix?: React.ReactNode;
  inputClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  prefix,
  prefixClassName,
  suffix,
  className,
  inputClassName,
  id,
  disabled,
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
      <div className="relative flex items-center w-full">
        {prefix && (
          <div
            className={classNames(
              "absolute left-5 top-[36px] -translate-y-1/2 text-sm font-mono font-semibold text-md-on-surface pointer-events-none z-10 flex items-center select-none",
              disabled ? "opacity-60" : "",
              prefixClassName
            )}
          >
            {prefix}
          </div>
        )}
        <input
          id={inputId}
          disabled={disabled}
          className={classNames(
            "bg-md-surface-container-low text-md-on-surface w-full h-14 pt-5 pb-1 rounded-xl border transition-colors duration-200 focus:outline-none text-sm placeholder:text-md-on-surface-variant/60 font-normal",
            prefix ? "pl-[54px]" : "px-5",
            suffix ? "pr-24" : "px-5",
            error
              ? "border-md-error focus:border-md-error ring-1 ring-md-error/50"
              : "border-md-outline/30 focus:border-md-primary",
            disabled ? "grayscale opacity-60 cursor-not-allowed" : "",
            inputClassName
          )}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 top-[30px] -translate-y-1/2 text-xs font-semibold text-md-on-surface-variant select-none pointer-events-none bg-md-surface-container px-2.5 py-1 rounded-lg border border-md-outline/20">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <span className="text-xs text-md-error mt-1 pl-[1.2rem]">{error}</span>
      )}
    </div>
  );
};
