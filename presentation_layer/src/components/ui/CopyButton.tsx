import React from 'react';
import { Copy } from 'lucide-react';
import { IconButton } from './IconButton';
import { useNotification } from './NotificationSystem';
import { copyToClipboard } from '../../utils/clipboard';

export interface CopyButtonProps {
  value: string;
  title?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Copy-to-clipboard icon button with a success toast (DESIGN.md — Case ID cells). */
export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  title = 'Copy to clipboard',
  size = 'sm',
  className,
}) => {
  const { notify } = useNotification();

  return (
    <IconButton
      title={title}
      variant="neutral"
      size={size}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        void copyToClipboard(value, notify);
      }}
    >
      <Copy size={14} />
    </IconButton>
  );
};
