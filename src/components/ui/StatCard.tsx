import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate';
  hint?: string;
}

const ACCENTS: Record<NonNullable<StatCardProps['accent']>, { icon: string; text: string }> = {
  emerald: { icon: 'bg-emerald-50 text-emerald-600 border-emerald-100', text: 'text-emerald-700' },
  amber: { icon: 'bg-amber-50 text-amber-600 border-amber-100', text: 'text-amber-700' },
  blue: { icon: 'bg-blue-50 text-blue-600 border-blue-100', text: 'text-blue-700' },
  rose: { icon: 'bg-rose-50 text-rose-600 border-rose-100', text: 'text-rose-700' },
  slate: { icon: 'bg-slate-100 text-slate-600 border-slate-200', text: 'text-slate-700' },
};

export function StatCard({ label, value, icon: Icon, accent = 'emerald', hint }: StatCardProps) {
  const a = ACCENTS[accent];
  return (
    <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={cn('p-2 rounded-xl border', a.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-black text-slate-900">{value}</h3>
        {hint && <span className={cn('text-xs font-semibold mt-1 block', a.text)}>{hint}</span>}
      </div>
    </div>
  );
}
