import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import classNames from 'classnames';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'general';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
}

interface NotificationContextType {
  notify: (notification: Omit<Notification, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// --- Toast Component ---
const Toast: React.FC<{
  notification: Notification;
  onDismiss: (id: string) => void;
}> = ({ notification, onDismiss }) => {
  const toastRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Slide in from right
    gsap.from(toastRef.current, {
      x: 100,
      opacity: 0,
      duration: 0.5,
      ease: 'back.out(1.2)'
    });

    // DESIGN.md toast rule: success/info auto-dismiss briefly; errors stay on
    // screen until the user closes them manually — an error that vanishes on
    // its own is an error the user never got to read.
    const duration = notification.type === 'error' ? 0 : notification.type === 'general' ? 8000 : 5000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    gsap.to(toastRef.current, {
      x: 100,
      opacity: 0,
      duration: 0.3,
      ease: 'power3.in',
      onComplete: () => onDismiss(notification.id)
    });
  };

  const typeConfig = {
    success: { bg: 'bg-md-success', border: 'border-md-success', text: 'text-md-on-success', icon: <CheckCircle2 size={24} /> },
    error: { bg: 'bg-md-error', border: 'border-md-error', text: 'text-md-on-error', icon: <AlertCircle size={24} /> },
    general: { bg: 'bg-md-warning', border: 'border-md-warning', text: 'text-md-on-warning', icon: <Info size={24} /> },
  };

  const config = typeConfig[notification.type];

  return (
    <div
      ref={toastRef}
      className={classNames(
        "flex items-start gap-4 p-4 rounded-xl border shadow-md w-80 relative overflow-hidden",
        config.bg,
        config.border,
        config.text
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {config.icon}
      </div>
      <div className="flex-grow">
        <h4 className="font-bold text-sm mb-1">{notification.title}</h4>
        {notification.message && <p className="text-xs opacity-90">{notification.message}</p>}
      </div>
      <button 
        onClick={handleDismiss}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X size={18} />
      </button>
    </div>
  );
};

// --- Provider Component ---
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        // DESIGN.md toast rule: right-hand notification stack always renders in
        // front of everything, including modal overlays (z-index 99999).
        <div className="fixed top-6 right-6 z-[100000] flex flex-col gap-3 pointer-events-none">
          {notifications.map(n => (
            <div key={n.id} className="pointer-events-auto">
              <Toast notification={n} onDismiss={dismiss} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  );
};
