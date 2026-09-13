import React, { useState } from 'react';
import classNames from 'classnames';
import { Eye, EyeOff } from 'lucide-react';

// --- MD3 Button ---
export interface MD3ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'fab';
  icon?: React.ReactNode;
}

export const MD3Button: React.FC<MD3ButtonProps> = ({
  variant = 'filled',
  children,
  icon,
  className,
  ...props
}) => {
  const baseClasses = "relative overflow-hidden inline-flex items-center justify-center font-medium transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] active:scale-95 group focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  let variantClasses = "";
  switch (variant) {
    case 'filled':
      variantClasses = "bg-md-primary text-md-on-primary rounded-full shadow-sm hover:shadow-md px-6 h-10 hover:bg-md-primary/90 active:bg-md-primary/80";
      break;
    case 'tonal':
      variantClasses = "bg-md-secondary-container text-md-on-secondary-container rounded-full shadow-sm hover:shadow-md px-6 h-10 hover:bg-md-secondary-container/90 active:bg-md-secondary-container/80";
      break;
    case 'outlined':
      variantClasses = "bg-transparent text-md-primary border border-md-outline rounded-full px-6 h-10 hover:bg-md-primary/5 active:bg-md-primary/10";
      break;
    case 'text':
      variantClasses = "bg-transparent text-md-primary rounded-full px-4 h-10 hover:bg-md-primary/10 active:bg-md-primary/5";
      break;
    case 'fab':
      variantClasses = "bg-md-tertiary text-white rounded-2xl shadow-md hover:shadow-xl w-14 h-14 hover:bg-md-tertiary/90 active:bg-md-tertiary/80 flex-col";
      break;
  }

  return (
    <button className={classNames(baseClasses, variantClasses, className)} {...props}>
      {/* State layer overlay is handled by background opacity on hover/active in tailwind */}
      {icon && <span className={classNames("flex items-center", children ? "mr-2" : "")}>{icon}</span>}
      {children}
    </button>
  );
};

// --- MD3 Input (Filled Text Field) ---
export interface MD3InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const MD3Input: React.FC<MD3InputProps> = ({ label, error, className, id, type, ...props }) => {
  const inputId = id || label.replace(/\s+/g, '-').toLowerCase();
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const currentType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={classNames("relative flex flex-col", className)}>
      <div className="relative group">
        <input
          id={inputId}
          type={currentType}
          className={classNames(
            "peer w-full h-14 px-4 pt-4 pb-1 text-md-on-surface bg-md-surface-container-low rounded-xl outline-none transition-shadow duration-200 placeholder-transparent",
            error ? "ring-1 ring-md-error focus:ring-md-error focus:ring-2" : "focus:ring-2 focus:ring-md-primary",
            isPasswordType ? "pr-12" : ""
          )}
          placeholder={label}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={classNames(
            "absolute left-4 top-2 text-xs font-medium transition-all duration-200 pointer-events-none peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs",
            error ? "text-md-error peer-focus:text-md-error" : "text-md-on-surface-variant peer-focus:text-md-primary"
          )}
        >
          {label}
        </label>
        {isPasswordType && (
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant hover:text-md-primary transition-colors focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-md-error mt-1 px-4">{error}</span>}
    </div>
  );
};

// --- MD3 Card ---
export const MD3Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { elevation?: number, interactive?: boolean }> = ({
  children,
  className,
  elevation = 1,
  interactive = false,
  ...props
}) => {
  const baseClasses = "bg-md-surface-container rounded-3xl p-6 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] text-md-on-surface";

  const shadowClasses = {
    0: "shadow-none",
    1: "shadow-sm",
    2: "shadow-md",
    3: "shadow-lg",
    4: "shadow-xl"
  }[elevation] || "shadow-sm";

  const interactiveClasses = interactive ? "hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-[0.98]" : "";

  return (
    <div className={classNames(baseClasses, shadowClasses, interactiveClasses, className)} {...props}>
      {children}
    </div>
  );
};

// --- Organic Blur Background ---
export const MD3BlurBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-md-background">
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-md-secondary-container/30 blur-[100px] mix-blend-multiply opacity-70"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-[100px] rounded-tr-[20px] bg-md-primary/20 blur-[80px] mix-blend-multiply opacity-60"></div>
      <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] rounded-full bg-md-tertiary/15 blur-[90px] mix-blend-multiply opacity-50"></div>
    </div>
  );
};
