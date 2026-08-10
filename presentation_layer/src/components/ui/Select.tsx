import React from 'react';
import classNames from 'classnames';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  className,
  id,
  ...props
}) => {
  const selectId = id || `select-${label.replace(/\s+/g, '-').toLowerCase()}`;
  
  return (
    <div className={classNames("flex flex-col relative", className)}>
      <label 
        htmlFor={selectId}
        className="text-xs text-md-on-surface-variant font-medium absolute top-2 left-5 z-10"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className="appearance-none bg-md-surface-container-low text-md-on-surface w-full h-14 pt-5 pb-1 px-5 rounded-xl border border-md-outline/30 focus:outline-none focus:border-md-primary transition-colors duration-200 cursor-pointer"
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-md-surface-container text-md-on-surface rounded-xl p-3 my-1">
              {opt.label}
            </option>
          )) }
        </select>
        <ChevronDown 
          className="absolute right-5 top-1/2 -translate-y-1/2 text-md-on-surface-variant pointer-events-none" 
          size={20} 
        />
      </div>
    </div>
  );
};
