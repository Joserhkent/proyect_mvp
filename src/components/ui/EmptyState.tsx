import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-14 px-6', className)}>
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3 border border-slate-200">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>}
    </div>
  );
}
