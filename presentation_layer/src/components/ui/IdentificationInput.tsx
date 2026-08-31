import React, {
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
  useCallback,
} from "react";
import classNames from "classnames";

/**
 * Formats raw digits or formatted input into NRIC format: XXXXXX-XX-XXXX (12 digits max)
 */
export const formatLiveIc = (input: string | null | undefined): string => {
  if (!input) return "";
  const digits = String(input).replace(/\D/g, "").slice(0, 12);
  if (!digits) return "";

  if (digits.length <= 6) {
    return digits;
  }
  if (digits.length <= 8) {
    return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
};

/**
 * Extracts raw digits (up to 12) from NRIC string.
 */
export const parseRawIcDigits = (input: string | null | undefined): string => {
  if (!input) return "";
  return String(input).replace(/\D/g, "").slice(0, 12);
};

export interface IdentificationInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "prefix"
  > {
  label: string;
  value?: string | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (formattedValue: string, rawDigits: string) => void;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const IdentificationInput: React.FC<IdentificationInputProps> = ({
  label,
  value,
  onChange,
  onValueChange,
  error,
  prefix,
  suffix,
  className,
  id,
  placeholder = "900101-14-5532",
  onBlur,
  onKeyDown,
  ...props
}) => {
  const inputId = id || `ic-input-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorPosRef = useRef<number | null>(null);

  const getInitialDisplayValue = useCallback((v: string | null | undefined): string => {
    return formatLiveIc(v);
  }, []);

  const [displayValue, setDisplayValue] = useState<string>(() =>
    getInitialDisplayValue(value)
  );

  // Sync with external value changes
  useEffect(() => {
    const currentDigits = parseRawIcDigits(displayValue);
    const newDigits = parseRawIcDigits(value);

    if ((value === "" || value === null || value === undefined) && displayValue !== "") {
      setDisplayValue("");
      return;
    }

    if (value !== "" && value !== null && value !== undefined) {
      if (currentDigits !== newDigits || displayValue === "") {
        setDisplayValue(getInitialDisplayValue(value));
      }
    }
  }, [value, getInitialDisplayValue, displayValue]);

  // Restore cursor position after DOM update
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

    // Count digits before cursor in raw input
    const digitsBeforeCursor = rawVal.slice(0, selStart).replace(/\D/g, "").length;

    // Live format to NRIC format: XXXXXX-XX-XXXX
    const formatted = formatLiveIc(rawVal);

    // Calculate new cursor position in formatted string
    let countedDigits = 0;
    let targetCursor = formatted.length;

    for (let i = 0; i < formatted.length; i++) {
      if (countedDigits >= digitsBeforeCursor) {
        targetCursor = i;
        break;
      }
      if (/\d/.test(formatted[i])) {
        countedDigits++;
      }
    }
    cursorPosRef.current = targetCursor;

    setDisplayValue(formatted);
    const rawDigits = parseRawIcDigits(formatted);

    if (onValueChange) {
      onValueChange(formatted, rawDigits);
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
      const normalized = formatLiveIc(displayValue);
      setDisplayValue(normalized);
      const rawDigits = parseRawIcDigits(normalized);

      if (onValueChange) {
        onValueChange(normalized, rawDigits);
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
    // Smart backspace: if user backspaces right after a hyphen (e.g. "123456-|12"), delete the digit before the hyphen
    if (
      e.key === "Backspace" &&
      inputRef.current &&
      inputRef.current.selectionStart === inputRef.current.selectionEnd
    ) {
      const cursor = inputRef.current.selectionStart ?? 0;
      if (cursor > 0 && displayValue[cursor - 1] === "-") {
        e.preventDefault();
        const newVal =
          displayValue.slice(0, cursor - 2) + displayValue.slice(cursor);
        const formatted = formatLiveIc(newVal);
        const targetCursor = Math.max(0, cursor - 2);
        cursorPosRef.current = targetCursor;

        setDisplayValue(formatted);
        const rawDigits = parseRawIcDigits(formatted);
        if (onValueChange) {
          onValueChange(formatted, rawDigits);
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
          maxLength={14}
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
