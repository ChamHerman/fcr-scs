import React, { useRef } from 'react';
import classNames from 'classnames';
import { Upload, Trash2 } from 'lucide-react';
import { IconButton } from './IconButton';

export interface FileUploadProps {
  label: string;
  fileName?: string;
  placeholder?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  onChange?: (file: File | null, event?: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  fileName,
  placeholder = 'Choose file (PDF, JPG, PNG, DOC, XLSX, CSV)',
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.csv',
  multiple = false,
  disabled = false,
  className,
  id,
  onChange,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = id || `file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (onChange) {
      onChange(file, e);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange(null);
    }
  };

  return (
    <div className={classNames('flex flex-col relative', className)}>
      <label
        htmlFor={inputId}
        className="text-xs text-md-on-surface-variant font-medium absolute top-2 left-5 z-10 pointer-events-none"
      >
        {label}
      </label>

      <div className="flex items-center gap-2">
        <label
          htmlFor={inputId}
          className={classNames(
            'flex-1',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          )}
        >
          <div
            className={classNames(
              'bg-md-surface-container-low text-md-on-surface w-full h-14 pt-5 pb-1 px-5 rounded-xl border border-md-outline/30',
              'hover:border-md-primary transition-colors duration-200 flex items-center justify-between text-left',
              disabled && 'hover:border-md-outline/30'
            )}
          >
            <span
              className={classNames(
                'text-sm truncate pr-2',
                fileName
                  ? 'text-md-on-surface font-medium'
                  : 'text-md-on-surface-variant opacity-60'
              )}
            >
              {fileName || placeholder}
            </span>
            <Upload
              size={18}
              className="text-md-on-surface-variant flex-shrink-0 ml-2"
            />
          </div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className="hidden"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            onChange={handleInputChange}
          />
        </label>
      </div>
    </div>
  );
};
