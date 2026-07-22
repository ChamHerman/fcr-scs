import React from 'react';
import classNames from 'classnames';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  options: RadioOption[];
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  name,
  value,
  onChange,
  orientation = 'vertical',
  className,
  ...props
}) => {
  return (
    <div className={classNames("flex", orientation === 'vertical' ? 'flex-col gap-3' : 'flex-row gap-6', className)}>
      {options.map((option) => {
        const id = `radio-${name}-${option.value}`;
        const isChecked = value === option.value;
        return (
          <div key={option.value} className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-5 h-5">
              <input
                type="radio"
                id={id}
                name={name}
                value={option.value}
                checked={isChecked}
                onChange={() => onChange && onChange(option.value)}
                className="peer appearance-none w-5 h-5 rounded-full border-2 border-md-on-surface-variant checked:border-md-primary transition-all duration-200 ease-md-bouncy cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2"
                {...props}
              />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-md-primary pointer-events-none opacity-0 peer-checked:opacity-100 peer-checked:scale-100 scale-50 transition-all duration-200 ease-md-bouncy" />
            </div>
            <label htmlFor={id} className="text-md-on-surface cursor-pointer select-none">
              {option.label}
            </label>
          </div>
        );
      })}
    </div>
  );
};
