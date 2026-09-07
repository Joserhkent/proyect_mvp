import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate' | 'lime';
  hint?: string;
}

const ACCENTS: Record<NonNullable<StatCardProps['accent']>, { icon: string; text: string }> = {
  emerald: { icon: 'bg-emerald-50 text-emerald-700 border-emerald-100', text: 'text-emerald-700' },
  lime: { icon: 'bg-lime-100 text-emerald-800 border-lime-200', text: 'text-emerald-700' },
  amber: { icon: 'bg-amber-50 text-amber-600 border-amber-100', text: 'text-amber-700' },
  blue: { icon: 'bg-blue-50 text-blue-600 border-blue-100', text: 'text-blue-700' },
  rose: { icon: 'bg-rose-50 text-rose-600 border-rose-100', text: 'text-rose-700' },
  slate: { icon: 'bg-slate-100 text-slate-600 border-slate-200', text: 'text-slate-700' },
};

export function StatCard({ label, value, icon: Icon, accent = 'emerald', hint }: StatCardProps) {
  const a = ACCENTS[accent];
  return (
    <div className="p-5 rounded-2xl bg-white border border-emerald-900/5 shadow-[0_2px_12px_-4px_rgba(6,78,59,0.08)] flex flex-col justify-between hover:shadow-[0_4px_16px_-4px_rgba(6,78,59,0.14)] transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={cn('p-2 rounded-xl border', a.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-[28px] leading-none font-black text-emerald-950 tracking-tight">{value}</h3>
        {hint && <span className={cn('text-sm font-semibold mt-2 block', a.text)}>{hint}</span>}
      </div>
    </div>
  );
}
