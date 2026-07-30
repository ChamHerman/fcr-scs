import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

interface ActionMenuPortalProps {
  actions: { label: string; onClick: () => void }[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const ActionMenuPortal: React.FC<ActionMenuPortalProps> = ({ actions, isOpen, onToggle, onClose }) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 160,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleScroll = (e: Event) => {
      // Ignore scrolling inside the menu itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return;
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      onClose();
    };

    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <button 
        ref={triggerRef}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
      >
        <MoreHorizontal size={18} />
      </button>
      {isOpen && ReactDOM.createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'absolute', right: 'auto', bottom: 'auto',
            top: coords.top, left: coords.left,
            backgroundColor: 'var(--md-surface-container, #F3EDF7)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '12px',
            zIndex: 9999,
            minWidth: '160px',
            overflow: 'hidden',
            border: '1px solid var(--md-outline, #79747E)'
          }}
        >
          {actions.map((action, idx) => (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
                onClose();
              }}
              style={{ 
                padding: '10px 16px', 
                fontSize: '14px', 
                cursor: 'pointer', 
                borderBottom: idx < actions.length - 1 ? '1px solid var(--md-surface-container-low, #E7E0EC)' : 'none', 
                color: 'var(--md-on-surface, #1C1B1F)' 
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--md-surface-container-low, #E7E0EC)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {action.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};
