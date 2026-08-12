import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  /**
   * Receives the chosen value directly. The native <select> is gone (it is the
   * only way to own the list's corners), so there is no ChangeEvent to hand back.
   */
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  /** When set, a hidden input mirrors the value so native form posts still work. */
  name?: string;
  className?: string;
}

const PANEL_MAX_HEIGHT = 280;
const ESTIMATED_ROW_HEIGHT = 44;
const TYPE_AHEAD_RESET_MS = 600;

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  id,
  name,
  className,
}) => {
  const selectId = id || `select-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const labelId = `${selectId}-label`;
  const valueId = `${selectId}-value`;
  const listboxId = `${selectId}-listbox`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const typeAhead = useRef({ query: '', at: 0 });

  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  /**
   * Anchors the panel to the trigger in document coordinates and decides which
   * way it opens. Flipping uses an estimate rather than the real height because
   * the panel has not rendered yet; `translateY(-100%)` does the exact alignment.
   */
  const position = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const estimatedHeight = Math.min(PANEL_MAX_HEIGHT, options.length * ESTIMATED_ROW_HEIGHT + 8);
    const roomBelow = window.innerHeight - rect.bottom;
    const flip = roomBelow < estimatedHeight && rect.top > roomBelow;

    setDropUp(flip);
    setCoords({
      top: (flip ? rect.top : rect.bottom) + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, [options.length]);

  const open = useCallback(() => {
    if (disabled) return;
    position();
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  }, [disabled, position, selectedIndex]);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    typeAhead.current = { query: '', at: 0 };
  }, []);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (option) onChange?.(option.value);
      close();
      triggerRef.current?.focus();
    },
    [close, onChange, options]
  );

  // Outside click, scroll, and resize handling while open.
  useEffect(() => {
    if (!isOpen) return;

    const isInside = (target: Node) =>
      Boolean(triggerRef.current?.contains(target) || panelRef.current?.contains(target));

    const handlePointerDown = (e: MouseEvent) => {
      if (!isInside(e.target as Node)) close();
    };
    const handleScroll = (e: Event) => {
      // Scrolling the list itself must not dismiss it.
      if (listRef.current?.contains(e.target as Node)) return;
      close();
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', position);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', position);
    };
  }, [isOpen, close, position]);

  // Keep the active row visible during keyboard traversal.
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  useGSAP(
    () => {
      if (!isOpen || !panelRef.current) return;
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, scaleY: 0.96, y: dropUp ? 6 : -6 },
        {
          opacity: 1,
          scaleY: 1,
          y: 0,
          duration: 0.22,
          ease: 'back.out(1.6)',
          transformOrigin: dropUp ? 'bottom center' : 'top center',
        }
      );
    },
    { dependencies: [isOpen, dropUp] }
  );

  const moveActive = (delta: number) => {
    setActiveIndex((prev) => {
      const from = prev < 0 ? selectedIndex : prev;
      const next = from + delta;
      if (next < 0) return options.length - 1;
      if (next >= options.length) return 0;
      return next;
    });
  };

  const searchByTypeAhead = (char: string) => {
    const now = Date.now();
    const query =
      now - typeAhead.current.at > TYPE_AHEAD_RESET_MS
        ? char.toLowerCase()
        : typeAhead.current.query + char.toLowerCase();
    typeAhead.current = { query, at: now };

    const match = options.findIndex((opt) => opt.label.toLowerCase().startsWith(query));
    if (match >= 0) setActiveIndex(match);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        commit(activeIndex);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(activeIndex);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          searchByTypeAhead(e.key);
        }
    }
  };

  return (
    <div className={classNames('flex flex-col relative', className)}>
      <label
        id={labelId}
        htmlFor={selectId}
        className="text-xs text-md-on-surface-variant font-medium absolute top-2 left-5 z-10 pointer-events-none"
      >
        {label}
      </label>

      <div className="relative">
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          // Label *and* current value, so assistive tech announces both.
          aria-labelledby={`${labelId} ${valueId}`}
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          disabled={disabled}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={handleKeyDown}
          className={classNames(
            'appearance-none bg-md-surface-container-low text-md-on-surface w-full h-14 pt-5 pb-1 px-5 pr-12 text-left text-sm',
            'border border-md-outline/30 focus:outline-none transition-all duration-200 ease-md-bouncy',
            // Bottom corners square off while the list is joined below (mirrored when it flips above).
            'rounded-xl',
            isOpen && !dropUp && 'rounded-b-none',
            isOpen && dropUp && 'rounded-t-none',
            isOpen ? 'border-md-primary' : 'focus-visible:border-md-primary',
            disabled ? 'grayscale opacity-60 cursor-not-allowed' : 'cursor-pointer'
          )}
        >
          <span
            id={valueId}
            className={classNames('block truncate', !selectedOption && 'text-md-on-surface-variant')}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </button>

        <ChevronDown
          className={classNames(
            'absolute right-5 top-1/2 -translate-y-1/2 text-md-on-surface-variant pointer-events-none transition-transform duration-200 ease-md-bouncy',
            isOpen && 'rotate-180'
          )}
          size={20}
        />
      </div>

      {name && <input type="hidden" name={name} value={value ?? ''} />}

      {isOpen &&
        ReactDOM.createPortal(
          <div
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
              transform: dropUp ? 'translateY(-100%)' : undefined,
            }}
          >
            <div
              ref={panelRef}
              className={classNames(
                'bg-md-surface-container border border-md-outline/30 shadow-lg overflow-hidden',
                // Square on every corner — the curve belongs to the field it hangs off.
                'rounded-none',
                dropUp ? 'border-b-0' : 'border-t-0'
              )}
            >
              <div
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-labelledby={labelId}
                className="md-scroll-thin overflow-y-auto overscroll-contain py-1"
                style={{ maxHeight: PANEL_MAX_HEIGHT }}
              >
                {options.map((opt, index) => {
                  const isSelected = opt.value === value;
                  const isActive = index === activeIndex;

                  return (
                    <div
                      key={opt.value}
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(index)}
                      className={classNames(
                        'flex items-center justify-between gap-3 px-5 py-3 text-sm cursor-pointer transition-colors duration-150',
                        isSelected
                          ? 'bg-md-secondary-container text-md-on-secondary-container font-medium'
                          : 'text-md-on-surface',
                        isActive && !isSelected && 'bg-md-surface-container-low'
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check size={16} className="shrink-0" />}
                    </div>
                  );
                })}

                {options.length === 0 && (
                  <div className="px-5 py-3 text-sm text-md-on-surface-variant">No options</div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
