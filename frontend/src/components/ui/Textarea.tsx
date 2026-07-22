import React from 'react';
import classNames from 'classnames';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  className,
  id,
  ...props
}) => {
  const inputId = id || `textarea-${label.replace(/\s+/g, '-').toLowerCase()}`;
  
  return (
    <div className={classNames("flex flex-col relative", className)}>
      <label 
        htmlFor={inputId}
        className="text-xs text-md-on-surface-variant font-medium absolute top-2 left-4 z-10"
      >
        {label}
      </label>
      <textarea
        id={inputId}
        className="bg-md-surface-container-low text-md-on-surface w-full min-h-[120px] pt-7 pb-3 px-4 rounded-t-sm rounded-b-none border-b-2 border-md-outline focus:outline-none focus:border-md-primary transition-colors duration-200 resize-y"
        {...props}
      />
    </div>
  );
};
