import React from 'react';
import classNames from 'classnames';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode;
  size?: 'sm' | 'md';
  direction?: 'row' | 'col';
  labelClassName?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  className,
  id,
  size = 'md',
  direction = 'row',
  labelClassName,
  ...props
}) => {
  const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;
  const isSm = size === 'sm';
  const isCol = direction === 'col';
  
  return (
    <div className={classNames(
      isCol ? "flex flex-col items-center justify-center gap-1 text-center" : "flex items-center gap-2.5",
      className
    )}>
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          id={switchId}
          className={classNames(
            "peer appearance-none bg-md-surface-container-low border-md-outline rounded-full checked:bg-md-primary checked:border-md-primary transition-colors duration-300 ease-md-bouncy cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2",
            isSm ? "w-9 h-5 border-[1.5px]" : "w-14 h-8 border-2"
          )}
          {...props}
        />
        <div
          className={classNames(
            "absolute bg-md-outline rounded-full pointer-events-none transition-all duration-300 ease-md-bouncy",
            isSm
              ? "left-[3px] top-[3px] w-3.5 h-3.5 peer-checked:translate-x-4 peer-checked:bg-md-on-primary"
              : "left-1.5 top-1.5 w-5 h-5 peer-checked:translate-x-6 peer-checked:bg-md-on-primary peer-checked:w-6 peer-checked:h-6 peer-checked:left-1"
          )}
        />
      </div>
      {label && (
        <label
          htmlFor={switchId}
          className={classNames(
            "cursor-pointer select-none text-md-on-surface",
            isCol
              ? "text-[11px] font-medium leading-none text-md-on-surface-variant whitespace-nowrap"
              : isSm ? "text-xs font-medium" : "text-sm",
            labelClassName
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
};
