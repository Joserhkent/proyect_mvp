'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextType {
  showToast: (variant: ToastVariant, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastVariant, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  error: 'bg-rose-50 border-rose-200 text-rose-900',
  info: 'bg-slate-900 border-slate-800 text-white',
};

const ICON_STYLES: Record<ToastVariant, string> = {
  success: 'text-emerald-600',
  error: 'text-rose-600',
  info: 'text-slate-300',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, variant, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-2.5 p-3.5 rounded-xl border shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2 pointer-events-auto',
                STYLES[t.variant]
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', ICON_STYLES[t.variant])} />
              <span className="flex-1 leading-relaxed">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="opacity-60 hover:opacity-100 shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
