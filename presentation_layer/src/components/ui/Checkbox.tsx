import React from 'react';
import classNames from 'classnames';
import { Check } from 'lucide-react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className,
  id,
  ...props
}) => {
  const inputId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={classNames("flex items-center gap-3", className)}>
      <div className="relative flex items-center justify-center w-5 h-5">
        <input
          type="checkbox"
          id={inputId}
          className="peer appearance-none w-5 h-5 border-2 border-md-on-surface-variant rounded-sm checked:bg-md-primary checked:border-md-primary transition-all duration-200 ease-md-bouncy cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          {...props}
        />
        <Check size={14} className="absolute text-md-on-primary pointer-events-none opacity-0 peer-checked:opacity-100 peer-checked:scale-100 scale-50 transition-all duration-200 ease-md-bouncy" strokeWidth={3} />
      </div>
      {label && (
        <label htmlFor={inputId} className="text-md-on-surface cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
};
