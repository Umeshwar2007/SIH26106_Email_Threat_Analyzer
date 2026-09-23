"use client";

import React, { forwardRef } from "react";
import clsx from "clsx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "dark" | "accent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium select-none transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99]";

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5 rounded",
      md: "h-9 px-4 text-xs gap-2 rounded",
      lg: "h-11 px-5 text-sm gap-2.5 rounded",
    };

    const variantStyles = {
      primary:
        "bg-ink text-paper hover:bg-neutral-900 border border-ink hover:border-accent-green/60 shadow-subtle",
      accent:
        "bg-ink text-paper hover:bg-neutral-900 border border-ink hover:border-accent-green hover:shadow-[0_0_12px_-2px_rgba(24,199,122,0.25)] shadow-subtle",
      secondary:
        "bg-paper text-ink border border-border-light hover:bg-paper-subtle hover:border-border-strong shadow-subtle",
      ghost: "bg-transparent text-ink hover:bg-paper-subtle hover:text-ink",
      destructive:
        "bg-threat-red text-paper hover:bg-red-700 border border-threat-red shadow-subtle",
      dark: "bg-forensic-surface text-forensic-text border border-forensic-border hover:bg-forensic-subtle",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
