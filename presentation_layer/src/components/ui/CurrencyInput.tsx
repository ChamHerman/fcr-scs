import React, {
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
  useCallback,
} from "react";
import classNames from "classnames";
import {
  formatLiveCurrency,
  formatCurrencyWithDecimals,
  parseCurrencyToNumber,
  calculateCursorPosition,
} from "../../utils/currency";

export interface CurrencyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
  > {
  label: string;
  value?: string | number | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (formattedValue: string, numericValue: number) => void;
  error?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChange,
  onValueChange,
  error,
  className,
  id,
  placeholder = "0.00",
  onBlur,
  onKeyDown,
  ...props
}) => {
  const inputId = id || `currency-input-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorPosRef = useRef<number | null>(null);

  // Derive initial formatted string from value
  const getInitialDisplayValue = useCallback(
    (v: string | number | null | undefined): string => {
      if (v === null || v === undefined || v === "") return "";
      const s = String(v).trim();
      // If already formatted with commas or decimals, preserve or format to 2 decimals
      if (s.includes(",") || s.includes(".")) {
        return formatCurrencyWithDecimals(s);
      }
      const num = parseFloat(s);
      if (!isNaN(num)) {
        return formatCurrencyWithDecimals(num);
      }
      return s;
    },
    []
  );

  const [displayValue, setDisplayValue] = useState<string>(() =>
    getInitialDisplayValue(value)
  );

  // Sync with external value changes (e.g. form reset, prefill, API load)
  useEffect(() => {
    // Only update if parsed numeric representation differs from current display
    const currentNum = parseCurrencyToNumber(displayValue);
    const newNum = parseCurrencyToNumber(value);

    // If incoming value is empty and display is not
    if ((value === "" || value === null || value === undefined) && displayValue !== "") {
      setDisplayValue("");
      return;
    }

    // If numeric value changed or display is empty but value provided
    if (value !== "" && value !== null && value !== undefined) {
      if (currentNum !== newNum || displayValue === "") {
        setDisplayValue(getInitialDisplayValue(value));
      }
    }
  }, [value, getInitialDisplayValue]);

  // Restore cursor position after DOM updates
  useLayoutEffect(() => {
    if (cursorPosRef.current !== null && inputRef.current) {
      const pos = cursorPosRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      cursorPosRef.current = null;
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const selStart = e.target.selectionStart ?? rawVal.length;

    // Live format with thousand separators and max 2 decimal places
    const formatted = formatLiveCurrency(rawVal);

    // Calculate preserved cursor position
    const targetCursor = calculateCursorPosition(rawVal, selStart, formatted);
    cursorPosRef.current = targetCursor;

    setDisplayValue(formatted);

    const numericVal = parseCurrencyToNumber(formatted);

    if (onValueChange) {
      onValueChange(formatted, numericVal);
    }

    if (onChange) {
      // Create synthetic event with formatted value
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name: props.name || "",
          id: inputId,
          value: formatted,
        },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (displayValue.trim() !== "") {
      const normalized = formatCurrencyWithDecimals(displayValue);
      setDisplayValue(normalized);
      const numericVal = parseCurrencyToNumber(normalized);

      if (onValueChange) {
        onValueChange(normalized, numericVal);
      }

      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            name: props.name || "",
            id: inputId,
            value: normalized,
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    }

    if (onBlur) {
      onBlur(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If Enter pressed, format to 2 decimal places
    if (e.key === "Enter") {
      if (displayValue.trim() !== "") {
        const normalized = formatCurrencyWithDecimals(displayValue);
        setDisplayValue(normalized);
        const numericVal = parseCurrencyToNumber(normalized);
        if (onValueChange) {
          onValueChange(normalized, numericVal);
        }
      }
    }

    // Smart backspace: if user backspaces right after a comma (e.g. "1,|000"), delete the digit before the comma
    if (
      e.key === "Backspace" &&
      inputRef.current &&
      inputRef.current.selectionStart === inputRef.current.selectionEnd
    ) {
      const pos = inputRef.current.selectionStart ?? 0;
      if (pos > 0 && displayValue[pos - 1] === ",") {
        e.preventDefault();
        // Remove the comma and the digit before it
        const nextRaw = displayValue.slice(0, pos - 2) + displayValue.slice(pos);
        const formatted = formatLiveCurrency(nextRaw);
        const targetCursor = calculateCursorPosition(nextRaw, pos - 2, formatted);
        cursorPosRef.current = targetCursor;
        setDisplayValue(formatted);

        const numericVal = parseCurrencyToNumber(formatted);
        if (onValueChange) onValueChange(formatted, numericVal);
        if (onChange) {
          const syntheticEvent = {
            target: { name: props.name || "", id: inputId, value: formatted },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className={classNames("flex flex-col relative", className)}>
      <label
        htmlFor={inputId}
        className={classNames(
          "text-xs font-medium absolute top-2 left-5 z-10 pointer-events-none transition-colors",
          error ? "text-md-error" : "text-md-on-surface-variant"
        )}
      >
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={classNames(
          "bg-md-surface-container-low text-md-on-surface w-full h-14 pt-5 pb-1 px-5 rounded-xl border transition-colors duration-200 focus:outline-none text-sm placeholder:text-md-on-surface-variant/60 font-medium",
          error
            ? "border-md-error focus:border-md-error ring-1 ring-md-error/50"
            : "border-md-outline/30 focus:border-md-primary"
        )}
        {...props}
      />
      {error && (
        <span className="text-xs text-md-error mt-1 pl-[1.2rem] font-medium">
          {error}
        </span>
      )}
    </div>
  );
};
