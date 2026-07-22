import React from 'react';
import classNames from 'classnames';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  className,
  id,
  ...props
}) => {
  const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={classNames("flex items-center gap-3", className)}>
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          id={switchId}
          className="peer appearance-none w-14 h-8 bg-md-surface-container-low border-2 border-md-outline rounded-full checked:bg-md-primary checked:border-md-primary transition-colors duration-300 ease-md-bouncy cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2"
          {...props}
        />
        <div className="absolute left-1.5 w-5 h-5 bg-md-outline rounded-full pointer-events-none peer-checked:translate-x-6 peer-checked:bg-md-on-primary peer-checked:w-6 peer-checked:h-6 peer-checked:left-1 transition-all duration-300 ease-md-bouncy" />
      </div>
      {label && (
        <label htmlFor={switchId} className="text-md-on-surface cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
};
