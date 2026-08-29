import React, { useRef, useId } from 'react';
import classNames from 'classnames';
import { Upload, Trash2, ExternalLink, FileText } from 'lucide-react';
import { IconButton } from './IconButton';

export interface FileUploadProps {
  label: string;
  fileName?: string;
  fileUrl?: string;
  placeholder?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  error?: string;
  onChange?: (file: File | null, event?: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  onView?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  fileName,
  fileUrl,
  placeholder = 'Choose file (PDF, JPG, PNG, DOC, XLSX, CSV)',
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.csv',
  multiple = false,
  disabled = false,
  className,
  id,
  error,
  onChange,
  onClear,
  onView,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const reactId = useId();
  const inputId = id || `file-upload-${reactId.replace(/:/g, '')}`;

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

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onView) {
      onView();
    } else if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const hasFile = Boolean(fileName);
  const canPreview = Boolean(hasFile && (fileUrl || onView));

  return (
    <div className={classNames('flex flex-col relative', className)}>
      <label
        htmlFor={hasFile ? undefined : inputId}
        className={classNames(
          'text-xs font-medium absolute top-2 left-5 z-10 pointer-events-none transition-colors',
          error ? 'text-md-error' : 'text-md-on-surface-variant'
        )}
      >
        {label}
      </label>

      <div className="flex items-center gap-2">
        <div
          onClick={canPreview ? handleView : () => inputRef.current?.click()}
          title={canPreview ? `Click to view document in new tab: ${fileName}` : undefined}
          className={classNames(
            'flex-1 bg-md-surface-container-low text-md-on-surface w-full h-14 pt-5 pb-1 px-5 rounded-xl border transition-all duration-200 flex items-center justify-between text-left group select-none',
            error
              ? 'border-md-error ring-1 ring-md-error/50'
              : 'border-md-outline/30 hover:border-md-primary',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            canPreview && 'hover:bg-md-primary/5 hover:border-md-primary/60'
          )}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            {hasFile && (
              <FileText size={16} className="text-md-primary flex-shrink-0" />
            )}
            <span
              className={classNames(
                'text-sm truncate font-medium',
                hasFile
                  ? 'text-md-primary hover:underline'
                  : 'text-md-on-surface-variant opacity-60'
              )}
            >
              {fileName || placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            {canPreview && (
              <button
                type="button"
                onClick={handleView}
                title="Open in new browser tab"
                className="p-1.5 rounded-lg text-md-primary hover:bg-md-primary/10 transition-colors flex items-center gap-1 text-xs font-semibold"
              >
                <ExternalLink size={15} />
                <span className="hidden sm:inline">View</span>
              </button>
            )}

            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              title={hasFile ? "Replace file" : "Upload file"}
              className="p-1.5 rounded-lg text-md-on-surface-variant hover:bg-md-surface-container-high transition-colors"
            >
              <Upload size={16} />
            </button>

            {hasFile && onClear && (
              <IconButton
                type="button"
                size="sm"
                variant="danger"
                title="Remove file"
                onClick={handleClear}
              >
                <Trash2 size={15} />
              </IconButton>
            )}
          </div>
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
      </div>

      {error && (
        <span className="text-xs text-md-error mt-1 pl-[1.2rem] font-medium">{error}</span>
      )}
    </div>
  );
};
