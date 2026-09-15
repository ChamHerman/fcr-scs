import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import classNames from 'classnames';
import { CheckCircle2, AlertCircle, Info, X, HelpCircle, Terminal, Copy, Check } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { parseAppError, isMemberAudience, memberErrorMessage } from '../../utils/errorParser';

export type NotificationType = 'success' | 'error' | 'general';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  guidance?: string;
  category?: string;
  rawDetails?: string;
}

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message?: string;
  guidance?: string;
  category?: string;
  rawDetails?: string;
  error?: any;
}

interface NotificationContextType {
  notify: (notification: NotificationInput) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// --- Error Details Modal ---
export const ErrorDetailsModal: React.FC<{
  notification: Notification | null;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!notification) return null;

  const handleCopy = async () => {
    if (!notification.rawDetails) return;
    try {
      await navigator.clipboard.writeText(notification.rawDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <Modal
      isOpen={Boolean(notification)}
      onClose={onClose}
      title="Error Diagnostics"
      subtitle={notification.category ? `Category: ${notification.category}` : 'Diagnostic Information'}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-md-on-surface-variant font-medium">
            Technical diagnostic payload for debugging & IT audit
          </div>
          <Button variant="filled" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* Friendly summary card */}
        <div className="p-4 rounded-xl bg-md-error/10 border border-md-error/20 text-md-on-surface flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 text-md-error mt-0.5" />
          <div className="space-y-1 min-w-0 flex-1">
            <h4 className="text-sm font-bold text-md-error">{notification.title}</h4>
            <p className="text-xs leading-relaxed break-words font-medium">{notification.message}</p>
          </div>
        </div>

        {/* Guidance / Resolution Steps */}
        {notification.guidance && (
          <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/15 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-md-primary">
              <HelpCircle size={15} />
              <span>Recommended Action & Guidance</span>
            </div>
            <p className="text-xs leading-relaxed text-md-on-surface-variant font-medium break-words">
              {notification.guidance}
            </p>
          </div>
        )}

        {/* Raw Technical Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1.5">
              <Terminal size={14} />
              Raw Technical Output
            </span>
            <Button
              variant="text"
              size="sm"
              onClick={handleCopy}
              className="text-xs font-semibold"
            >
              {copied ? (
                <>
                  <Check size={14} className="mr-1 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="mr-1" />
                  <span>Copy Payload</span>
                </>
              )}
            </Button>
          </div>
          <pre className="p-4 bg-slate-950 text-emerald-400 dark:bg-black/95 dark:text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap break-all border border-slate-800 select-all leading-relaxed">
            {notification.rawDetails || notification.message || 'No additional technical details available.'}
          </pre>
        </div>
      </div>
    </Modal>
  );
};

// --- Toast Component ---
const Toast: React.FC<{
  notification: Notification;
  onDismiss: (id: string) => void;
  onShowDetails: (notification: Notification) => void;
}> = ({ notification, onDismiss, onShowDetails }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const isDismissingRef = useRef<boolean>(false);

  const { contextSafe } = useGSAP({ scope: wrapperRef });

  const handleDismiss = contextSafe(() => {
    if (isDismissingRef.current || !toastRef.current || !wrapperRef.current) return;
    isDismissingRef.current = true;

    // Smooth exit: slide out right with opacity & scale decay, then collapse height
    const tl = gsap.timeline({
      onComplete: () => onDismiss(notification.id),
    });

    tl.to(toastRef.current, {
      x: 120,
      opacity: 0,
      scale: 0.94,
      duration: 0.32,
      ease: 'power3.in',
    })
    .set(wrapperRef.current, { overflow: 'hidden' })
    .to(
      wrapperRef.current,
      {
        height: 0,
        opacity: 0,
        paddingTop: 0,
        paddingBottom: 0,
        marginTop: 0,
        marginBottom: 0,
        duration: 0.24,
        ease: 'power2.out',
      },
      '-=0.12'
    );
  });

  useGSAP(
    () => {
      if (!toastRef.current) return;

      // Smooth slide-in with subtle bounce
      gsap.fromTo(
        toastRef.current,
        {
          x: 120,
          opacity: 0,
          scale: 0.94,
        },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 0.45,
          ease: 'power3.out',
        }
      );

      // DESIGN.md toast persistence rules (strictly preserved):
      // success: 5s, general: 8s, error: persists indefinitely (0)
      const duration =
        notification.type === 'error'
          ? 0
          : notification.type === 'general'
          ? 8000
          : 5000;

      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    },
    { scope: wrapperRef }
  );

  const typeConfig = {
    success: { bg: 'bg-md-success', border: 'border-md-success', text: 'text-md-on-success', icon: <CheckCircle2 size={24} /> },
    error: { bg: 'bg-md-error', border: 'border-md-error', text: 'text-md-on-error', icon: <AlertCircle size={24} /> },
    general: { bg: 'bg-md-warning', border: 'border-md-warning', text: 'text-md-on-warning', icon: <Info size={24} /> },
  };

  const config = typeConfig[notification.type];

  return (
    <div ref={wrapperRef} className="pointer-events-auto">
      <div
        ref={toastRef}
        className={classNames(
          "flex items-start gap-3 p-4 rounded-xl border shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.35)] w-[420px] max-w-[calc(100vw-2rem)] relative overflow-hidden transition-colors will-change-transform",
          config.bg,
          config.border,
          config.text
        )}
      >
        <div className="flex-shrink-0 mt-0.5">
          {config.icon}
        </div>

        {/* Content wrapper: min-w-0 flex-1 guarantees that long text wraps and never pushes the close button */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-bold text-sm leading-snug">{notification.title}</h4>
            {notification.category && (
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/15 shrink-0 opacity-90">
                {notification.category}
              </span>
            )}
          </div>

          {notification.message && (
            <p className="text-xs opacity-90 leading-relaxed break-words line-clamp-3">
              {notification.message}
            </p>
          )}

          {notification.guidance && (
            <div className="mt-2 p-2 rounded-lg bg-black/5 dark:bg-white/10 text-[11px] leading-snug border border-black/10 dark:border-white/15 flex items-start gap-1.5 text-inherit">
              <HelpCircle size={13} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span className="break-words font-medium">{notification.guidance}</span>
            </div>
          )}

          {notification.rawDetails && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => onShowDetails(notification)}
                className="inline-flex items-center gap-1.5 text-xs font-bold underline opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Terminal size={12} className="shrink-0" />
                <span>Error Details</span>
              </button>
            </div>
          )}
        </div>

        {/* Pinned dismiss button: flex-shrink-0 ensures it is NEVER pushed away */}
        <button 
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 -mr-1 -mt-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/15 transition-all cursor-pointer"
          aria-label="Close notification"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

// --- Provider Component ---
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeErrorModal, setActiveErrorModal] = useState<Notification | null>(null);

  const notify = useCallback((input: NotificationInput) => {
    const id = Math.random().toString(36).substr(2, 9);
    let { type, title, message, guidance, category, rawDetails, error } = input;

    // Member-portal audience: keep error toasts short and plain —
    // no category badge, no diagnostics guidance, no Error Details modal.
    if (type === 'error' && isMemberAudience()) {
      const parsed = parseAppError(error || message || '', title);
      setNotifications(prev => [
        ...prev,
        { id, type, title, message: memberErrorMessage(typeof message === 'string' ? message : undefined, parsed) },
      ]);
      return;
    }

    // Automated error diagnostic normalization
    if (type === 'error' && (error || message)) {
      const errToParse = error || message;
      const parsed = parseAppError(errToParse, title);

      if (!guidance) {
        guidance = parsed.guidance;
      }
      if (!category) {
        category = parsed.category;
      }
      if (!rawDetails) {
        rawDetails = parsed.rawDetails;
      }

      // If message is overly verbose, technical stack trace, or raw JSON, use friendly message
      if (
        !message ||
        typeof message !== 'string' ||
        message.length > 120 ||
        message.includes('server response') ||
        message.includes('code=SERVER_ERROR') ||
        message.includes('requestUrl') ||
        message.startsWith('{')
      ) {
        message = parsed.message;
      }
    }

    setNotifications(prev => [...prev, { id, type, title, message, guidance, category, rawDetails }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* Toast Notification Stack */}
          <div className="fixed top-6 right-6 z-[100000] flex flex-col gap-3 pointer-events-none">
            {notifications.map(n => (
              <div key={n.id} className="pointer-events-auto">
                <Toast
                  notification={n}
                  onDismiss={dismiss}
                  onShowDetails={(notif) => setActiveErrorModal(notif)}
                />
              </div>
            ))}
          </div>

          {/* Diagnostic Details Modal */}
          {activeErrorModal && (
            <ErrorDetailsModal
              notification={activeErrorModal}
              onClose={() => setActiveErrorModal(null)}
            />
          )}
        </>,
        document.body
      )}
    </NotificationContext.Provider>
  );
};
