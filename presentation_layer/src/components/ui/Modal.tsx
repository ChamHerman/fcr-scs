import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { X } from 'lucide-react';
import { Button } from './Button';
import classNames from 'classnames';
import { useScrollEdges } from '../../hooks/useScrollEdges';

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
  confirmDisabled?: boolean;
  keepMounted?: boolean;
  maxWidth?: string;
  className?: string;
  preventBackdropClose?: boolean;
  showCloseButton?: boolean;
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
  confirmDisabled = false,
  keepMounted = true,
  maxWidth = 'max-w-lg',
  className,
  preventBackdropClose = false,
  showCloseButton = true,
}) => {
  const [hasOpened, setHasOpened] = useState(isOpen);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Drives the scroll affordances. Gated on isOpen because a closed modal is
  // display:none, where every scroll measurement reads zero.
  const {
    ref: bodyRef,
    measure: measureBody,
    isScrollable,
    atTop,
    atBottom,
  } = useScrollEdges<HTMLDivElement>(isOpen);

  const hasHeader = Boolean(title || subtitle);
  const hasFooter = Boolean(footer || cancelText || confirmText);
  const showTopEdge = isScrollable && !atTop;
  const showBottomEdge = isScrollable && !atBottom;

  useEffect(() => {
    if (isOpen && !hasOpened) {
      setHasOpened(true);
    }
  }, [isOpen, hasOpened]);

  // The panel is display:none until opened, so the first honest measurement can
  // only happen on the frame after it becomes visible.
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(measureBody);
    return () => cancelAnimationFrame(frame);
  }, [isOpen, measureBody]);
  useEffect(() => {
    if (!isOpen || preventBackdropClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, preventBackdropClose, onClose]);


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
    if (preventBackdropClose) return;
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const renderFooterContent = () => {
    if (footer) return footer;

    return (
      <div className="flex items-center justify-end gap-3">
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
            disabled={confirmDisabled || confirmLoading || !onConfirm}
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
          'md-modal-content w-full rounded-xl bg-md-surface-container shadow-2xl border border-md-outline/10',
          maxWidth,
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header — pinned; hairline arms once the body is scrolled down */}
        {hasHeader && (
          <div
            className={classNames(
              'flex items-start justify-between shrink-0 px-6 pt-6 pb-4 transition-colors duration-200 ease-md-bouncy border-b',
              showTopEdge ? 'border-md-outline/10' : 'border-transparent'
            )}
          >
            <div>
              {title && <h3 className="text-xl font-bold text-md-on-surface">{title}</h3>}
              {subtitle && <p className="text-xs text-md-on-surface-variant mt-1">{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="text-md-on-surface-variant hover:text-md-on-surface p-1 rounded-full hover:bg-md-primary/10 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Modal Body — the only scroller in the panel */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={bodyRef}
            className={classNames(
              'md-modal-body md-scroll-thin flex-1 min-h-0 overflow-y-auto overscroll-contain px-6',
              !hasHeader && 'pt-6',
              !hasFooter && 'pb-6'
            )}
          >
            {children}
          </div>
          <div
            aria-hidden="true"
            className={classNames('md-modal-fade md-modal-fade-top', showTopEdge && 'is-visible')}
          />
          <div
            aria-hidden="true"
            className={classNames('md-modal-fade md-modal-fade-bottom', showBottomEdge && 'is-visible')}
          />
        </div>

        {/* Modal Footer — pinned; hairline arms while content remains below */}
        {hasFooter && (
          <div
            className={classNames(
              'shrink-0 px-6 pb-6 pt-4 transition-colors duration-200 ease-md-bouncy border-t',
              showBottomEdge ? 'border-md-outline/10' : 'border-transparent'
            )}
          >
            {renderFooterContent()}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
