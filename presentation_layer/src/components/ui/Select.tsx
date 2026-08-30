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
  error?: string;
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
  error,
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

  // Sync internal active index when value prop changes
  useEffect(() => {
    const idx = options.findIndex((opt) => opt.value === value);
    setActiveIndex(idx);
  }, [value, options]);

  const selectedOption = options.find((opt) => opt.value === value);

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldDropUp = spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;
    setDropUp(shouldDropUp);
    setCoords({
      top: (shouldDropUp ? rect.top : rect.bottom) + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  const open = () => {
    if (disabled) return;
    updateCoords();
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  const commit = (index: number) => {
    const opt = options[index];
    if (opt && onChange) {
      onChange(opt.value);
    }
    close();
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    };

    const onScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  // GSAP animation for panel open/close
  useGSAP(
    () => {
      if (!isOpen || !panelRef.current) return;
      gsap.fromTo(
        panelRef.current,
        {
          opacity: 0,
          scaleY: 0.85,
          transformOrigin: dropUp ? 'bottom center' : 'top center',
        },
        {
          opacity: 1,
          scaleY: 1,
          duration: 0.18,
          ease: 'power2.out',
        }
      );
    },
    { dependencies: [isOpen, dropUp], scope: panelRef }
  );

  // Scroll active option into view when navigating
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const el = optionRefs.current[activeIndex];
    if (el && listRef.current) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, activeIndex]);

  const moveActive = (delta: number) => {
    if (options.length === 0) return;
    if (!isOpen) {
      open();
      return;
    }
    setActiveIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return options.length - 1;
      if (next >= options.length) return 0;
      return next;
    });
  };

  const searchByTypeAhead = (char: string) => {
    const now = Date.now();
    const isContinuing = now - typeAhead.current.at < TYPE_AHEAD_RESET_MS;
    const query = (isContinuing ? typeAhead.current.query : '') + char.toLowerCase();
    typeAhead.current = { query, at: now };

    const matchIndex = options.findIndex((opt) =>
      opt.label.toLowerCase().startsWith(query)
    );
    if (matchIndex >= 0) {
      setActiveIndex(matchIndex);
      if (!isOpen) {
        commit(matchIndex);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        open();
        return;
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        searchByTypeAhead(e.key);
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
        className={classNames(
          'text-xs font-medium absolute top-2 left-5 z-10 pointer-events-none transition-colors',
          error ? 'text-md-error' : 'text-md-on-surface-variant'
        )}
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
          aria-labelledby={`${labelId} ${valueId}`}
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          disabled={disabled}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={handleKeyDown}
          className={classNames(
            'appearance-none bg-md-surface-container-low text-md-on-surface w-full h-14 pt-5 pb-1 px-5 pr-12 text-left text-sm',
            'border focus:outline-none transition-all duration-200 ease-md-bouncy',
            'rounded-xl',
            isOpen && !dropUp && 'rounded-b-none',
            isOpen && dropUp && 'rounded-t-none',
            error
              ? 'border-md-error ring-1 ring-md-error/50'
              : isOpen
              ? 'border-md-primary'
              : 'border-md-outline/30 focus-visible:border-md-primary',
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

      {error && (
        <span className="text-xs text-md-error mt-1 pl-[1.2rem]">{error}</span>
      )}

      {name && <input type="hidden" name={name} value={value ?? ''} />}

      {isOpen &&
        ReactDOM.createPortal(
          <div
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 100005,
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