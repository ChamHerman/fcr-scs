import React, {
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
  useCallback,
} from "react";
import classNames from "classnames";
import {
  formatLiveInteger,
  formatAreaWithoutDecimals,
  parseCurrencyToNumber,
  calculateCursorPosition,
} from "../../utils/currency";

export interface AreaInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "prefix"
  > {
  label: string;
  value?: string | number | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (formattedValue: string, numericValue: number) => void;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const AreaInput: React.FC<AreaInputProps> = ({
  label,
  value,
  onChange,
  onValueChange,
  error,
  prefix,
  suffix,
  className,
  id,
  placeholder = "10,000",
  onBlur,
  onKeyDown,
  ...props
}) => {
  const inputId = id || `area-input-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorPosRef = useRef<number | null>(null);

  // Derive initial formatted string from value
  const getInitialDisplayValue = useCallback(
    (v: string | number | null | undefined): string => {
      if (v === null || v === undefined || v === "") return "";
      const s = String(v).trim();
      if (s.includes(",")) {
        return formatAreaWithoutDecimals(s);
      }
      const num = parseFloat(s);
      if (!isNaN(num)) {
        return formatAreaWithoutDecimals(num);
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

    // Live format integer with thousand separators and no decimals
    const formatted = formatLiveInteger(rawVal);

    // Calculate preserved cursor position
    const targetCursor = calculateCursorPosition(rawVal, selStart, formatted);
    cursorPosRef.current = targetCursor;

    setDisplayValue(formatted);

    const numericVal = parseCurrencyToNumber(formatted);

    if (onValueChange) {
      onValueChange(formatted, numericVal);
    }

    if (onChange) {
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
      const normalized = formatAreaWithoutDecimals(displayValue);
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
    // Smart backspace: if user backspaces right after a comma (e.g. "1,|000"), delete the digit before the comma
    if (
      e.key === "Backspace" &&
      inputRef.current &&
      inputRef.current.selectionStart === inputRef.current.selectionEnd
    ) {
      const cursor = inputRef.current.selectionStart ?? 0;
      if (cursor > 0 && displayValue[cursor - 1] === ",") {
        e.preventDefault();
        // Remove the comma AND the character before it
        const newVal =
          displayValue.slice(0, cursor - 2) + displayValue.slice(cursor);
        const formatted = formatLiveInteger(newVal);

        // Adjust cursor target
        const targetCursor = Math.max(0, cursor - 2);
        cursorPosRef.current = targetCursor;

        setDisplayValue(formatted);

        const numericVal = parseCurrencyToNumber(formatted);
        if (onValueChange) {
          onValueChange(formatted, numericVal);
        }
        if (onChange) {
          const syntheticEvent = {
            ...e,
            target: {
              ...inputRef.current,
              name: props.name || "",
              id: inputId,
              value: formatted,
            },
          } as unknown as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
        return;
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

      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-4 top-[22px] flex items-center pointer-events-none text-sm font-normal text-md-on-surface-variant select-none">
            {prefix}
          </div>
        )}

        <input
          {...props}
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={classNames(
            "bg-md-surface-container-low text-md-on-surface w-full h-14 pt-5 pb-1 rounded-xl border transition-colors duration-200 focus:outline-none text-sm placeholder:text-md-on-surface-variant/60 font-normal",
            prefix ? "pl-11" : "px-5",
            suffix ? "pr-24" : "px-5",
            error
              ? "border-md-error focus:border-md-error ring-1 ring-md-error/50"
              : "border-md-outline/30 focus:border-md-primary",
            props.disabled ? "grayscale opacity-60 cursor-not-allowed" : ""
          )}
        />

        {suffix && (
          <div className="absolute right-4 top-[22px] flex items-center pointer-events-none text-sm font-normal text-md-on-surface-variant select-none">
            {suffix}
          </div>
        )}
      </div>

      {error && (
        <span className="text-xs text-md-error mt-1 pl-[1.2rem]">
          {error}
        </span>
      )}
    </div>
  );
};
