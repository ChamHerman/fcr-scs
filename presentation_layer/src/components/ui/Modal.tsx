import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { X } from 'lucide-react';
import { Button } from './Button';
import classNames from 'classnames';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  onConfirm?: () => void;
  confirmVariant?: 'filled' | 'danger';
  confirmLoading?: boolean;
  keepMounted?: boolean;
  maxWidth?: string;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  cancelText,
  confirmText,
  onConfirm,
  confirmVariant = 'filled',
  confirmLoading = false,
  keepMounted = true,
  maxWidth = 'max-w-lg',
  className,
}) => {
  const [hasOpened, setHasOpened] = useState(isOpen);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !hasOpened) {
      setHasOpened(true);
    }
  }, [isOpen, hasOpened]);

  useGSAP(() => {
    if (!hasOpened) return;

    if (isOpen) {
      if (overlayRef.current) {
        overlayRef.current.style.display = 'flex';
        overlayRef.current.style.pointerEvents = 'auto';
        gsap.fromTo(
          overlayRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.2, ease: 'power2.out' }
        );
      }
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { scale: 0.96, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.28, ease: 'back.out(1.6)' }
        );
      }
    } else {
      if (overlayRef.current && contentRef.current) {
        overlayRef.current.style.pointerEvents = 'none';
        gsap.to(contentRef.current, {
          scale: 0.96,
          opacity: 0,
          duration: 0.18,
          ease: 'power2.in',
        });
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.18,
          ease: 'power2.in',
          onComplete: () => {
            if (overlayRef.current) {
              overlayRef.current.style.display = 'none';
            }
            if (!keepMounted) {
              setHasOpened(false);
            }
          },
        });
      }
    }
  }, { dependencies: [isOpen, hasOpened] });

  if (!hasOpened) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const renderFooter = () => {
    if (footer) return footer;
    if (!cancelText && !confirmText) return null;

    return (
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-md-outline/10">
        {cancelText && (
          <Button variant="text" size="md" onClick={onClose} disabled={confirmLoading}>
            {cancelText}
          </Button>
        )}
        {confirmText && (
          <Button
            variant={confirmVariant}
            size="md"
            onClick={onConfirm}
            isLoading={confirmLoading}
          >
            {confirmText}
          </Button>
        )}
      </div>
    );
  };

  return ReactDOM.createPortal(
    <div
      ref={overlayRef}
      className="md-modal-overlay"
      onClick={handleOverlayClick}
      style={{
        display: isOpen ? 'flex' : 'none',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      <div
        ref={contentRef}
        className={classNames(
          'md-modal-content w-full rounded-xl bg-md-surface-container p-6 shadow-2xl border border-md-outline/10',
          maxWidth,
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between mb-4">
            <div>
              {title && <h3 className="text-xl font-bold text-md-on-surface">{title}</h3>}
              {subtitle && <p className="text-xs text-md-on-surface-variant mt-1">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-md-on-surface-variant hover:text-md-on-surface p-1 rounded-full hover:bg-md-primary/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto mb-4">{children}</div>

        {/* Modal Footer */}
        {renderFooter()}
      </div>
    </div>,
    document.body
  );
};
