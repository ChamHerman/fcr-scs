import React from 'react';
import classNames from 'classnames';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  
  return (
    <div className={classNames("flex flex-col relative", className)}>
      <label 
        htmlFor={inputId}
        className="text-xs text-md-on-surface-variant font-medium absolute top-2 left-5 z-10"
      >
        {label}
      </label>
      <input
        id={inputId}
        className="bg-md-surface-container-low text-md-on-surface w-full h-14 pt-5 pb-1 px-5 rounded-xl border border-md-outline/30 focus:outline-none focus:border-md-primary transition-colors duration-200"
        {...props}
      />
    </div>
  );
};
