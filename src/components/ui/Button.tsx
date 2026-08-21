import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
    
    const variants = {
      primary: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 focus:ring-emerald-500",
      secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400",
      outline: "border border-slate-300 hover:bg-slate-50 text-slate-700 focus:ring-emerald-500 bg-white",
      ghost: "hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus:ring-slate-400",
      danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 focus:ring-rose-500",
      success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 focus:ring-emerald-500",
    };

    const sizes = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-6 py-2.5 gap-2.5",
      icon: "p-2 h-9 w-9",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
